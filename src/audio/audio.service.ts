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

@Injectable()
export class AudioService {
  constructor(
    private prisma: PrismaService,
    private socket: SocketService,
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
      sortBy?: string;
    },
    page: string,
  ) {
    const { size, search, sortBy } = query;
    const options = {
      page: page ? +page : 0,
      size: size ? +size : 5,
      search: search ? String(search) : '',
    };

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
        skip: options.page * options.size,
        take: options.size,
        orderBy: {
          createdAt: 'desc',
        },
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
      this.createSongFile(file, userId, id);

      if (image.size) {
        this.createSongImage(image, id);
      }

      const song = await this.prisma.song.create({
        data: {
          id,
          author,
          file: `http://localhost:5001/users-songs/${
            userId + '-' + id + '.mp3'
          }`,
          title,
          image: image.size
            ? `http://localhost:5001/songs-images/${
                id + '.' + image.originalname.split('.')[1]
              }`
            : '',
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
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!song) return { message: 'Bad data' };
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

      this.deleteSongFile(userId, id);

      if (imageEtc) {
        this.deleteSongImage(id, String(imageEtc));
      }

      const song = await this.prisma.song.delete({
        where: {
          id,
        },
      });

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
    const playlist = await this.prisma.playlist.create({
      data: {
        id,
        title,
        userid: userId,
        image: image?.size
          ? `http://localhost:5001/playlists-images/${id}.${
              image.originalname.split('.')[1]
            }`
          : '',
        songs: {
          connect: serializedSongs,
        },
      },
      include: {
        songs: true,
        author: true,
      },
    });
    if (image?.size) {
      this.createPlaylistImage(image, id);
    }
    return playlist;
  }

  async getPlaylists(
    query: {
      size?: string;
      search?: string;
      sortBy?: string;
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
    const playlists = await this.prisma.playlist.findMany({
      where: {
        OR: [{ title: { contains: options.search } }],
      },
      skip: options.page * options.size,
      take: options.size,
      orderBy: {
        title: 'desc',
      },
      include: {
        songs: true,
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
        songs: true,
        author: true,
      },
    });
    if (!playlist) throw new NotFoundException();
    return playlist;
  }

  async deletePlaylist(userId: string, id: string, imageEtc: string) {
    if (!id) throw new BadRequestException('Miss the field!');

    if (imageEtc) {
      this.deletePlaylistImage(id, String(imageEtc));
    }

    const playlist = await this.prisma.playlist.delete({
      where: { id },
      include: {
        songs: true,
        author: true,
      },
    });

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
    const data = new Uint8Array(file.buffer);
    writeFile(
      'public/users-songs/' + userId + '-' + songId + '.mp3',
      data,
      function (err) {
        if (err) throw err;
      },
    );
  }

  private createSongImage(file: Express.Multer.File, songId: string) {
    const data = new Uint8Array(file.buffer);
    writeFile(
      'public/songs-images/' + songId + '.' + file.originalname.split('.')[1],
      data,
      function (err) {
        if (err) throw err;
      },
    );
  }

  private deleteSongFile(userId: string, songId: string) {
    unlink(`public/users-songs/${userId}-${songId}.mp3`, function (err) {
      if (err && err.code == 'ENOENT') {
        console.info("File doesn't exist, won't remove it.");
      } else if (err) {
        console.error('Error occurred while trying to remove file');
      } else {
        console.info(`removed`);
      }
    });
  }

  private deleteSongImage(songId: string, imageEtc: string) {
    unlink(`public/songs-images/${songId}.${imageEtc}`, function (err) {
      if (err && err.code == 'ENOENT') {
        console.info("File doesn't exist, won't remove it.");
      } else if (err) {
        console.error('Error occurred while trying to remove file');
      } else {
        console.info(`removed`);
      }
    });
  }

  private createPlaylistImage(file: Express.Multer.File, playlistId: string) {
    const data = new Uint8Array(file.buffer);
    writeFile(
      'public/playlists-images/' +
        playlistId +
        '.' +
        file.originalname.split('.')[1],
      data,
      function (err) {
        if (err) throw err;
      },
    );
  }

  private deletePlaylistImage(playlistId: string, imageEtc: string) {
    unlink(`public/playlists-images/${playlistId}.${imageEtc}`, function (err) {
      if (err && err.code == 'ENOENT') {
        console.info("File doesn't exist, won't remove it.");
      } else if (err) {
        console.error('Error occurred while trying to remove file');
      } else {
        console.info(`removed`);
      }
    });
  }

  private async getSongImage(name: string) {
    const path = 'public/users-songs/' + name;

    const res = await new Promise((resolve) => {
      readFile(path, { encoding: 'base64' }, (err, data) => {
        resolve(data);
      });
    });

    return res;
  }
}
