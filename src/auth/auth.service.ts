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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private lib: LibService,
    private userService: UserService,
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
    try {
      const user = await this.userService.save({
        id,
        login,
        password: hashPassword,
        image: file?.size
          ? `http://localhost:5001/users-avatars/${id}.${
              file?.originalname.split('.')[1]
            }`
          : '',
      });
      if (file && file?.originalname !== 'undefined') {
        this.createUserAvatar(file, id);
      }
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

  async auth(user: { id: string; login: string }) {
    try {
      const authUser = await this.userService.getUserById(user.id);
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
      const { password, ...authUserWithoutPassword } = authUser;
      return authUserWithoutPassword;
    } catch (error) {
      const err = error as Error;
      console.log(err.message);
      throw new UnauthorizedException(err.message);
    }
  }

  private createUserAvatar(file: Express.Multer.File, id: string) {
    const data = new Uint8Array(file.buffer);
    writeFile(
      `public/users-avatars/${id}.${file.originalname.split('.')[1]}`,
      data,
      function (err) {
        if (err) throw err;
        console.log('adding file complete');
      },
    );
  }
}
