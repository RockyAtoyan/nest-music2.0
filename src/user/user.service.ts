import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/db/prisma.service';
import { SocketService } from '../socket/socket.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private socket: SocketService,
  ) {}

  async save(data: Prisma.PersonCreateInput) {
    try {
      const user = await this.prisma.person.create({
        data,
      });
      if (!user) {
        throw new BadRequestException();
      }
      return user;
    } catch (err) {
      console.log(err.message);
      throw new BadRequestException(err.message);
    }
  }

  async getUserById(
    id: string,
    include?: Prisma.PersonInclude,
    filter?: Prisma.PersonWhereInput,
  ) {
    try {
      const user = await this.prisma.person.findUnique({
        where: { ...filter, id },
        include,
      });
      if (!user) {
        throw new BadRequestException();
      }
      return user;
    } catch (err) {
      console.log(err.message);
      throw new BadRequestException(err.message);
    }
  }

  async getUserByLogin(login: string) {
    try {
      const user = await this.prisma.person.findFirst({
        where: { login },
      });
      if (!user) {
        return null;
      }
      return user;
    } catch (err) {
      console.log(err.message);
      return null;
    }
  }

  private async getAll(
    filter: Array<Object>,
    skip: number,
    take: number,
    orderBy: Object,
    include?: Object,
  ) {
    return this.prisma.person.findMany({
      where: {
        OR: filter,
      },
      skip,
      take,
      orderBy,
    });
  }

  private async countUsers(filter: Prisma.PersonWhereInput) {
    return this.prisma.person.count({
      where: filter,
    });
  }

  async getUsersPage(
    query: {
      size?: string;
      search?: string;
      recommended?: string;
      sortBy?: 'popular' | 'name-asc' | 'name-desc';
    },
    params: { page: string },
  ) {
    const { size, search, recommended, sortBy } = query;
    const { page } = params;
    const options = {
      page: page ? +page : 0,
      size: size ? +size : 5,
      search: search ? String(search) : '',
      recommended: recommended ? JSON.parse(String(recommended)) : false,
    };
    let orderBy:
      | Prisma.PersonOrderByWithRelationInput
      | Prisma.PersonOrderByWithRelationInput[] = {};
    if (sortBy === 'popular') {
      orderBy = [
        {
          subscribers: {
            _count: 'desc',
          },
        },
        {
          login: 'desc',
        },
      ];
    }
    if (sortBy === 'name-asc') {
      orderBy = { login: 'asc' };
    }
    if (sortBy === 'name-desc') {
      orderBy = { login: 'desc' };
    }
    try {
      const users = await this.getAll(
        [
          {
            login: { contains: options.search },
          },
        ],
        options.page * options.size,
        options.size,
        recommended
          ? [
              {
                subscribers: {
                  _count: 'desc',
                },
              },
              {
                login: 'desc',
              },
            ]
          : orderBy,
      );

      const total = await this.countUsers({
        OR: [
          {
            login: { contains: options.search },
          },
        ],
      });
      if (!users) {
        return { users: [], total: 0 };
      }
      return { users, total };
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      return { message: err.message };
    }
  }

  async getUser(id: string) {
    if (!id) {
      throw new BadRequestException();
    }
    try {
      const user = await this.getUserById(id, {
        songs: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            person: true,
          },
        },
        lasts: {
          include: {
            song: {
              include: {
                person: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        subscribs: {
          include: {
            subscribed: {
              include: {
                lasts: {
                  include: {
                    song: {
                      include: {
                        person: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        playlists: {
          include: {
            author: true,
            songs: {
              orderBy: {
                createdAt: 'desc',
              },
              include: {
                person: true,
              },
            },
          },
        },
        notifications: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      });
      return user;
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      return { message: err.message };
    }
  }

  async getUserSongs(id: string) {
    if (!id) {
      throw new BadRequestException();
    }
    try {
      const songs = await this.prisma.song.findMany({
        where: { userid: id },
        orderBy: { createdAt: 'desc' },
      });
      if (!songs) {
        throw new NotFoundException();
      }
      return songs;
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      return { message: err.message };
    }
  }

  async follow(id: string, authUser: { id: string; login: string }) {
    try {
      if (!id) {
        throw new BadRequestException();
      }
      if (id === authUser.id) {
        throw new BadRequestException('It`s you');
      }

      const isExist = await this.getUserById(id);

      if (!isExist) return { message: 'This user does not exist' };

      const isFollow = await this.prisma.follow.findFirst({
        where: {
          subscriberId: authUser.id,
          subscribedId: id,
        },
      });
      if (isFollow)
        return {
          message: 'Already followed!',
        };

      const follow = await this.prisma.follow.create({
        data: {
          subscriberId: authUser.id,
          subscribedId: isExist.id,
        },
        include: {
          subscribed: true,
          subscriber: true,
        },
      });

      if (!follow)
        return {
          message: 'Already followed or this user does not exist',
        };

      this.socket.sendMessage(
        {
          type: 'message',
          text: `You are following ${follow.subscribed.login} now!`,
        },
        [authUser.id],
      );
      this.socket.sendMessage(
        {
          type: 'message',
          text: `${follow.subscriber.login} is following you now!`,
        },
        [id],
      );
      const notification = await this.prisma.notification.create({
        data: {
          link: `/profile/${follow.subscriber.id}`,
          text: `${follow.subscriber.login} is following you now!`,
          person: {
            connect: {
              id,
            },
          },
        },
      });
      return { followData: follow, userId: authUser.id };
    } catch (e) {
      const err = e as Error;
      console.log(err.message);
      return { message: err.message };
    }
  }

  async unfollow(id: string, authUser: { id: string; login: string }) {
    try {
      if (!id) {
        throw new BadRequestException();
      }
      if (id === authUser.id) {
        throw new BadRequestException('It`s you');
      }

      const isExist = await this.getUserById(id);

      if (!isExist) return { message: 'This user does not exist' };

      const isFollow = await this.prisma.follow.findFirst({
        where: {
          subscriberId: authUser.id,
          subscribedId: id,
        },
      });
      if (!isFollow)
        return {
          message: 'Not followed!',
        };

      const follow = await this.prisma.follow.deleteMany({
        where: {
          subscriberId: authUser.id,
          subscribedId: isExist.id,
        },
      });

      if (!follow)
        return {
          message: 'Already unfollowed or this user does not exist',
        };

      this.socket.sendMessage(
        {
          type: 'message',
          text: `You are not following ${isExist.login} now!`,
        },
        [authUser.id],
      );
      this.socket.sendMessage(
        {
          type: 'message',
          text: `${authUser.login} is not following you now!`,
        },
        [id],
      );
      return { followData: follow, userId: authUser.id };
    } catch (e) {
      const err = e as Error;
      console.log(err.message);
      return { message: err.message };
    }
  }

  async getSubscribes(id: string) {
    if (!id) {
      throw new BadRequestException();
    }
    try {
      const { subscribs } = await this.getUserById(id, {
        subscribs: {
          take: 3,
          orderBy: {
            subscribed: {
              subscribers: {
                _count: 'desc',
              },
            },
          },
          include: {
            subscribed: true,
          },
        },
      });
      return subscribs;
    } catch (e) {
      const err = e as Error;
      console.log(err.message);
      return { message: err.message };
    }
  }

  async getSubscribers(id: string) {
    if (!id) {
      throw new BadRequestException();
    }
    try {
      const { subscribers } = await this.getUserById(id, {
        subscribers: {
          take: 3,
          orderBy: {
            subscriber: {
              subscribers: {
                _count: 'desc',
              },
            },
          },
          include: {
            subscriber: true,
          },
        },
      });
      return subscribers;
    } catch (e) {
      const err = e as Error;
      console.log(err.message);
      return { message: err.message };
    }
  }
}
