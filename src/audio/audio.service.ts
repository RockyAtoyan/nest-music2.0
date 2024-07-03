import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { v4 as uuid } from 'uuid';
import { readFile, rename, unlink, writeFile } from 'fs';
import { Prisma } from '@prisma/client';
import { SocketService } from '../socket/socket.service';
import { StorageService } from 'src/storage/storage.service';

@Injectable()
export class AudioService {
  constructor(
    private prisma: PrismaService,
    private socket: SocketService,
    private storage: StorageService,
  ) {}

  async getSongById(id: string, include?: Prisma.SongInclude) {
    return this.prisma.song.findUnique({
      where: { id },
      include,
    });
  }
  async getSongs(
    query: {
      size?: string;
      search?: string;
      sortBy?: 'listens' | 'name' | 'old' | 'new';
    },
    page: string,
  ) {
    const { size, search, sortBy } = query;
    const options = {
      page: page ? +page : 0,
      size: size ? +size : 5,
      search: search ? String(search) : '',
    };
    let orderBy:
      | Prisma.SongOrderByWithRelationInput
      | Prisma.SongOrderByWithRelationInput[] = {};
    if (sortBy === 'listens') {
      orderBy = { usersListens: { _count: 'desc' } };
    }
    if (sortBy === 'name') {
      orderBy = { title: 'asc' };
    }
    if (sortBy === 'new') {
      orderBy = { createdAt: 'desc' };
    }
    if (sortBy === 'old') {
      orderBy = { createdAt: 'asc' };
    }
    try {
      const songs = await this.prisma.song.findMany({
        where: {
          OR: [
            {
              title: { contains: options.search },
            },
            {
              author: { contains: options.search },
            },
          ],
        },
        include: {
          person: true,
        },
        skip: options.page * options.size,
        take: options.size,
        orderBy,
      });

      const total = await this.prisma.song.count({
        where: {
          OR: [
            {
              title: { contains: options.search },
            },
            {
              author: { contains: options.search },
            },
          ],
        },
      });
      if (!songs) {
        return { songs: [], total: 0 };
      }
      return { songs, total };
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      return { message: err.message };
    }
  }

  async addSong(
    userId: string,
    payload: { title: string; author: string },
    file: Express.Multer.File,
    image: Express.Multer.File,
  ) {
    try {
      const { title, author } = payload;

      if (!file.originalname || !title || !author) {
        return { message: 'Miss the field' };
      }

      const id = uuid();

      const fileUrl = await this.createSongFile(file, userId, id);
      let imageUrl: string | undefined;
      if (image.size) {
        imageUrl = await this.createSongImage(image, id);
      }

      const song = await this.prisma.song.create({
        data: {
          id,
          author,
          file: fileUrl,
          title,
          image: imageUrl || '',
          userid: userId,
        },
        include: {
          person: {
            include: {
              subscribers: {
                select: {
                  subscriber: {
                    select: {
                      id: true,
                      login: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!song) return { message: 'Bad data' };
      for (let i = 0; i < song.person.subscribers.length; i++) {
        const { subscriber: sub } = song.person.subscribers[i];
        const notification = await this.prisma.notification.create({
          data: {
            link: `/profile/${song.person.id}`,
            text: `New audio from ${song.person.login}!`,
            person: {
              connect: {
                id: sub.id,
              },
            },
          },
        });
      }
      this.socket.sendMessage(
        {
          type: 'message',
          text: `New audio "${song.title}" from ${song.person.login}!`,
        },
        song.person.subscribers.map(({ subscriber }) => subscriber.id),
      );
      return song;
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      return { message: err.message };
    }
  }

  async deleteSong(userId: string, id: string, imageEtc: string) {
    try {
      if (!id) {
        throw new BadRequestException('Miss the field!');
      }

      const song = await this.prisma.song.delete({
        where: {
          id,
        },
      });

      await this.deleteSongFile(song.file);

      if (song.image) {
        await this.deleteSongImage(song.image);
      }

      if (!song) throw new BadRequestException('Bad data');

      return { song, id: userId };
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      throw new HttpException(err.message, 400);
    }
  }

  async getSongFile(id: string) {
    if (!id) {
      throw new BadRequestException('Bad Request');
    }
    try {
      const song = await this.getSongById(id, {
        person: true,
      });
      if (!song) {
        throw new NotFoundException();
      }
      const file = await this.getSongImage(
        song.person.id + '-' + song.id + '.mp3',
      );
      if (!file) {
        throw new BadRequestException('Not found!');
      }
      return file;
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      throw new HttpException(err.message, 400);
    }
  }

  async createPlaylist(
    userId: string,
    payload: { title: string; songs: string[] },
    image: Express.Multer.File,
  ) {
    const { title, songs } = payload;
    const serializedSongs = Array.isArray(songs) ? songs : JSON.parse(songs);
    if (!title) throw new BadRequestException('Bad request');
    const id = uuid();

    let imageUrl: string | undefined;
    if (image?.size) {
      imageUrl = await this.createPlaylistImage(image, id);
    }

    const playlist = await this.prisma.playlist.create({
      data: {
        id,
        title,
        userid: userId,
        image: imageUrl || '',
        songs: {
          connect: serializedSongs,
        },
      },
      include: {
        songs: true,
        author: true,
      },
    });
    return playlist;
  }

  async getPlaylists(
    query: {
      size?: string;
      search?: string;
      sortBy?: 'popular' | 'old' | 'new' | 'name';
    },
    params: { page: string },
  ) {
    const { size, search, sortBy } = query;
    const { page } = params;
    const options = {
      page: page ? +page : 0,
      size: size ? +size : 5,
      search: search ? String(search) : '',
    };
    let orderBy:
      | Prisma.PlaylistOrderByWithRelationInput
      | Prisma.PlaylistOrderByWithRelationInput[] = {};
    if (sortBy === 'popular') {
      orderBy = { author: { subscribers: { _count: 'desc' } } };
    }
    if (sortBy === 'name') {
      orderBy = { title: 'asc' };
    }
    if (sortBy === 'new') {
      orderBy = { createdAt: 'desc' };
    }
    if (sortBy === 'old') {
      orderBy = { createdAt: 'asc' };
    }
    const playlists = await this.prisma.playlist.findMany({
      where: {
        OR: [{ title: { contains: options.search } }],
      },
      skip: options.page * options.size,
      take: options.size,
      orderBy,
      include: {
        songs: {
          include: {
            person: true,
          },
        },
        author: true,
      },
    });

    const total = await this.prisma.playlist.count({
      where: {
        OR: [{ title: { contains: options.search } }],
      },
    });
    if (!playlists) {
      return { songs: [], total: 0 };
    }
    return { playlists, total };
  }

  async getPlaylist(id: string) {
    if (!id) throw new BadRequestException('Bad Request!');
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        songs: {
          include: {
            person: true,
          },
        },
        author: true,
      },
    });
    if (!playlist) throw new NotFoundException();
    return playlist;
  }

  async deletePlaylist(userId: string, id: string, imageEtc: string) {
    if (!id) throw new BadRequestException('Miss the field!');

    const playlist = await this.prisma.playlist.delete({
      where: { id },
      include: {
        songs: true,
        author: true,
      },
    });

    if (playlist.image) {
      await this.deletePlaylistImage(playlist.image);
    }

    if (!playlist) throw new BadRequestException('Bad data!');

    return { playlist, id: userId };
  }

  async addSongToPlaylist(
    userId: string,
    params: { id: string },
    body: { songId: string },
  ) {
    const { id } = params;
    const { songId } = body;
    await this.prisma.playlist.update({
      where: {
        id,
        userid: userId,
      },
      data: {
        songs: {
          connect: {
            id: songId,
          },
        },
      },
    });
    return { id: userId };
  }

  async removeSongToPlaylist(
    userId: string,
    params: { id: string; songId: string },
  ) {
    const { id, songId } = params;
    await this.prisma.playlist.update({
      where: {
        id,
        userid: userId,
      },
      data: {
        songs: {
          disconnect: {
            id: songId,
          },
        },
      },
    });
    return { id: userId };
  }

  async addListenToSong(songId: string, userId: string) {
    const listen = await this.prisma.listen.updateMany({
      where: {
        songId,
        userId,
      },
      // data: {
      //   createdAt: new Date(),
      //   expires: new Date(Date.now() + 1000 * 3600 * 24),
      // },
      data: {
        expires: new Date(Date.now() + 1000 * 3600 * 24),
      },
    });
    if (listen.count === 0) {
      await this.prisma.listen.create({
        data: {
          songId,
          userId,
          expires: new Date(Date.now() + 1000 * 3600 * 24),
        },
      });
    }
    const song = await this.prisma.song.update({
      where: { id: songId },
      data: {
        usersListens: {
          connect: {
            id: userId,
          },
        },
      },
    });
    return { song };
  }

  private createSongFile(
    file: Express.Multer.File,
    userId: string,
    songId: string,
  ) {
    return this.storage.uploadSongFile(file, userId + '-' + songId + '.mp3');
  }

  private createSongImage(file: Express.Multer.File, songId: string) {
    return this.storage.uploadSongImage(
      file,
      songId + '.' + file.originalname.split('.')[1],
    );
  }

  private deleteSongFile(url: string) {
    return this.storage.deleteSongFile(url);
  }

  private deleteSongImage(url) {
    return this.storage.deleteSongImage(url);
  }

  private createPlaylistImage(file: Express.Multer.File, playlistId: string) {
    return this.storage.uploadPlaylistImage(
      file,
      playlistId + '.' + file.originalname.split('.')[1],
    );
  }

  private deletePlaylistImage(url: string) {
    return this.storage.deletePlaylistImage(url);
  }

  private async getSongImage(name: string) {
    return this.storage.getSongFile(name);
  }
}
