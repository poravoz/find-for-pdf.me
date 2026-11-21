import {
  Controller,
  Get,
  Param,
  Delete,
  Patch,
  Put,
  Body,
  Post,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/updateUser.dto';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from './interfaces/authentificated-request.interface';
import { AVATAR_CONFIG } from './config/avatar.config';
import JwtRefreshGuard from '../authentication/jwt-strategy/jwt-refresh.guard';
import { VerifyPasswordChangeDto } from './dto/verify-password-change.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getAll() {
    return await this.usersService.getAll();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return await this.usersService.getById(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.usersService.delete(id);
  }

  @UseGuards(JwtRefreshGuard)
  @Patch('profile')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() userData: UpdateUserDto,
  ) {
    return await this.usersService.update(
      req.user.id,
      { name: userData.name },
    );
  }

  @UseGuards(JwtRefreshGuard)
  @Post('email/change')
  async requestEmailChange(
    @Req() req: AuthenticatedRequest,
    @Body() emailData: ChangeEmailDto,
  ) {
    return await this.usersService.requestEmailChange(
      req.user.id,
      emailData,
    );
  }

  @UseGuards(JwtRefreshGuard)
  @Post('email/verify-change')
  async verifyEmailChange(
    @Req() req: AuthenticatedRequest,
    @Body() codeData: VerifyEmailChangeDto,
  ) {
    return await this.usersService.verifyEmailChange(
      req.user.id,
      codeData,
    );
  }

  @UseGuards(JwtRefreshGuard)
  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('avatar', AVATAR_CONFIG))
  async updateAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return await this.usersService.updateAvatar(
      req.user.id,
      file,
    );
  }

  @UseGuards(JwtRefreshGuard)
  @Post('password/request-change')
  async requestPasswordChange(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.requestPasswordChange(req.user.id);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('password/verify-change')
  async verifyPasswordChange(
    @Req() req: AuthenticatedRequest,
    @Body() passwordData: VerifyPasswordChangeDto,
  ) {
    return this.usersService.verifyPasswordChange(
      req.user.id,
      passwordData,
    );
  }

  @UseGuards(JwtRefreshGuard)
  @Delete('profile/avatar')
  async removeAvatar(
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.usersService.removeAvatar(
      req.user.id,
    );
  }

}
