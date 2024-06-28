import { AuthGuard } from 'src/auth/auth.guard';
import { UserService } from './user.service';
import {
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('/:page')
  getPage(@Query() query, @Param() params) {
    return this.userService.getUsersPage(query, params);
  }

  @Get('profile/:id')
  getUser(@Param('id') id) {
    return this.userService.getUser(id);
  }

  @Get('/profile/:id/songs')
  getUserSongs(@Param('id') id) {
    return this.userService.getUserSongs(id);
  }

  @Get('/profile/:id/subscribes')
  getUserSubscribes(@Param('id') id) {
    return this.userService.getSubscribes(id);
  }

  @Get('/profile/:id/subscribers')
  getUserSubscribers(@Param('id') id) {
    return this.userService.getSubscribers(id);
  }

  @UseGuards(AuthGuard)
  @Put('/profile/:id/follow')
  follow(@Param('id') id, @Req() req) {
    return this.userService.follow(id, req.user);
  }

  @UseGuards(AuthGuard)
  @Put('/profile/:id/unfollow')
  unfollow(@Param('id') id, @Req() req) {
    return this.userService.unfollow(id, req.user);
  }
}
