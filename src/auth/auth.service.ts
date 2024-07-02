import { UserService } from './../user/user.service';
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegistrationDto } from './dto/registration.dto';
import { PrismaService } from 'src/db/prisma.service';
import { v4 as uuid } from 'uuid';
import { compareSync, hashSync } from 'bcrypt';
import { writeFile } from 'fs';
import { LoginDto } from './dto/login.dto';
import { LibService } from 'src/lib/lib.service';
import { StorageService } from 'src/storage/storage.service';
import { EditDto } from './dto/edit.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private lib: LibService,
    private userService: UserService,
    private storage: StorageService,
  ) {}

  async registration(payload: RegistrationDto, file: Express.Multer.File) {
    const { login, password } = payload;
    if (!login || !password) {
      throw new BadRequestException('Miss the field');
    }
    const isIn = await this.userService.getUserByLogin(login);
    if (isIn) {
      throw new BadRequestException('User with this login is already exist');
    }
    const hashPassword = hashSync(password, 7);
    const id = uuid();

    let imageUrl: string | undefined;
    if (file?.size) {
      imageUrl = await this.createUserAvatar(file, id);
    }

    try {
      const user = await this.userService.save({
        id,
        login,
        password: hashPassword,
        image: imageUrl || '',
      });
      return user;
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      throw new BadRequestException(err.message);
    }
  }

  async login(payload: LoginDto) {
    const { login, password } = payload;
    const user = await this.userService.getUserByLogin(login);
    if (!user) {
      throw new BadRequestException('User with this login is not exist');
    }
    const isPasswordsCompares = compareSync(password, user.password);
    if (!isPasswordsCompares) {
      throw new BadRequestException('Wrong password');
    }
    try {
      const { accessToken } = this.lib.getTokens({
        id: user.id,
        login: user.login,
      });
      return {
        user: { id: user.id, login: user.login },
        accessToken,
      };
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      throw new BadRequestException(err.message);
    }
  }

  async editProfile(payload: EditDto, id: string) {
    const { login, password } = payload;
    const user = await this.userService.getUserById(id);
    if (!user) {
      throw new BadRequestException('User with this login is not exist');
    }
    try {
      const editedUser = await this.prisma.person.update({
        where: { id },
        data: {
          login: login || user.login,
          password: password ? hashSync(password, 7) : user.password,
        },
      });
      return editedUser;
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      throw new BadRequestException(err.message);
    }
  }

  async editProfileImage(file: Express.Multer.File, id: string) {
    const user = await this.userService.getUserById(id);
    if (!user) {
      throw new BadRequestException('User with this login is not exist');
    }
    if (!file) {
      throw new BadRequestException('No file!');
    }
    try {
      let image;
      if (user.image) {
        image = await this.changeUserAvatar(file, user.image);
      } else {
        image = await this.createUserAvatar(file, id);
      }
      const editedUser = await this.prisma.person.update({
        where: { id },
        data: {
          image: image || '',
        },
      });
      return editedUser;
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      throw new BadRequestException(err.message);
    }
  }

  async auth(user: { id: string; login: string }) {
    try {
      const authUser = await this.userService.getUserById(user.id, {
        notifications: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      });
      if (!authUser) {
        throw new UnauthorizedException();
      }
      await this.prisma.listen.deleteMany({
        where: {
          userId: authUser.id,
          expires: {
            lte: new Date(),
          },
        },
      });
      await this.prisma.notification.deleteMany({
        where: {
          userId: authUser.id,
          expires: {
            lte: new Date(),
          },
        },
      });
      const { password, ...authUserWithoutPassword } = authUser;
      return authUserWithoutPassword;
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      throw new UnauthorizedException(err.message);
    }
  }

  private createUserAvatar(file: Express.Multer.File, id: string) {
    return this.storage.uploadProfileImage(
      file,
      `${id}.${file.originalname.split('.')[1]}`,
    );
  }

  private changeUserAvatar(file: Express.Multer.File, url: string) {
    return this.storage.changeProfileImage(file, url);
  }
}
