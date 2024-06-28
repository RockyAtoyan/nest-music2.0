import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { AudioService } from './audio.service';
import { Post, UseInterceptors } from '@nestjs/common/decorators';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';

@Controller()
export class AudioController {
  constructor(private audioService: AudioService) {}

  @Get('/songs/:page')
  getSongs(@Query() query, @Param('page') page) {
    return this.audioService.getSongs(query, page);
  }

  @Get('/song/:id')
  getSong(@Param('id') id) {
    return this.audioService.getSongById(id);
  }

  @Get('/songs/file/:id')
  getSongFile(@Param('id') id) {
    return this.audioService.getSongFile(id);
  }

  @Get('/playlists/:page')
  getPlaylists(@Query() query, @Param() params) {
    return this.audioService.getPlaylists(query, params);
  }

  @Get('/playlist/:id')
  getPlaylist(@Param('id') id) {
    return this.audioService.getPlaylist(id);
  }

  @UseGuards(AuthGuard)
  @Post('/playlists')
  @UseInterceptors(FileInterceptor('image'))
  createPlaylist(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
    @Body() body,
  ) {
    return this.audioService.createPlaylist(req.user.id, body, file);
  }

  @UseGuards(AuthGuard)
  @Post('/songs')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  addSong(
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
    @Req() req,
    @Body() body,
  ) {
    return this.audioService.addSong(
      req.user.id,
      body,
      files.file[0],
      files.image[0],
    );
  }

  @UseGuards(AuthGuard)
  @Put('/playlists/song/:id')
  addSongToPlaylist(@Req() req, @Param('id') id, @Body() body) {
    return this.audioService.addSongToPlaylist(req.user.id, id, body);
  }

  @UseGuards(AuthGuard)
  @Delete('/song/:id')
  deleteSong(@Req() req, @Param('id') id, @Query('imageEtc') imageEtc) {
    return this.audioService.deleteSong(req.user.id, id, imageEtc);
  }

  @UseGuards(AuthGuard)
  @Delete('/playlists/:id')
  deletePlaylist(@Req() req, @Param('id') id, @Query('imageEtc') imageEtc) {
    return this.audioService.deletePlaylist(req.user.id, id, imageEtc);
  }

  @UseGuards(AuthGuard)
  @Delete('/playlists/:id/song/:songId')
  removeSongFromPlaylist(@Req() req, @Param() params) {
    return this.audioService.removeSongToPlaylist(req.user.id, params);
  }

  @UseGuards(AuthGuard)
  @Patch('/song/:id/listen/:userId')
  addListenToSong(@Param('id') id, @Param('userId') userId) {
    return this.audioService.addListenToSong(id, userId);
  }
}
