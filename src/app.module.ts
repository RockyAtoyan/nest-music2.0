import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join, resolve } from 'path';
import { AuthModule } from './auth/auth.module';
import { LibModule } from './lib/lib.module';
import { PrismaModule } from './db/prisma.module';
import { UserModule } from './user/user.module';
import { AudioModule } from './audio/audio.module';
import { SocketModule } from './socket/socket.module';
import { StorageService } from './storage/storage.service';
import { StorageModule } from './storage/storage.module';

export const __dirname = resolve();

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
    }),
    AuthModule,
    LibModule,
    StorageModule,
    PrismaModule,
    UserModule,
    AudioModule,
    SocketModule,
  ],
  controllers: [AppController],
  providers: [AppService, StorageService],
})
export class AppModule {}
