import {
  Controller,
  Post,
  Get,
  UseGuards,
  Body,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common/decorators';
import { AuthService } from './auth.service';
import { RegistrationDto } from './dto/registration.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';
import { Patch, Put } from '@nestjs/common';
import { EditDto } from './dto/edit.dto';

@Controller()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/registration')
  @UseInterceptors(FileInterceptor('image'))
  registration(@Body() payload: RegistrationDto, @UploadedFile() image) {
    return this.authService.registration(payload, image);
  }

  @Post('/login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @UseGuards(AuthGuard)
  @Put('/edit')
  edit(@Body() payload: EditDto, @Request() req) {
    return this.authService.editProfile(payload, req.user.id);
  }

  @UseGuards(AuthGuard)
  @Patch('/edit-image')
  @UseInterceptors(FileInterceptor('image'))
  editImage(@UploadedFile() image, @Request() req) {
    return this.authService.editProfileImage(image, req.user.id);
  }

  @UseGuards(AuthGuard)
  @Get('/auth')
  auth(@Request() req) {
    return this.authService.auth(req.user);
  }
}
