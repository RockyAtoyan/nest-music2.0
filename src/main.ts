import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common/pipes';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    credentials: true,
    origin: [
      'http://localhost:3000',
      'https://music2-0-black.vercel.app',
      'https://rockyatoyan-musichub.vercel.app',
      'https://atoyanmusichub.ru',
      'https://www.atoyanmusichub.ru',
    ],
  });
  app.useGlobalPipes(new ValidationPipe());
  app.setGlobalPrefix('/server');
  await app.listen(3000);
}
bootstrap();
