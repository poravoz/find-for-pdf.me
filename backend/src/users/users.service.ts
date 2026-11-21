import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import User from './entities/users.entity';
import CreateUserDto from './dto/createUsers.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { MailService } from '../mail/mail.service';
import { ChangeEmailDto } from './dto/change-email.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto';
import { StorageService } from '../chat/storage.service';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';
import { VerifyPasswordChangeDto } from './dto/verify-password-change.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private mailService: MailService,
    private storageService: StorageService,
    private configService: ConfigService,
  ) {}
  
  async getAll() {
    return await this.usersRepository.find();
  }

  async getById(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
  
    if (user) {
      return user;
    }
  
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }
 
  async getUserIfRefreshTokenMatches(refreshToken: string, userId: string) {
    const user = await this.getById(userId);
  
    if (!user.currentHashedRefreshToken) {
      throw new HttpException('Refresh token not found', HttpStatus.UNAUTHORIZED);
    }
  
    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.currentHashedRefreshToken,
    );
  
    if (!isRefreshTokenMatching) {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
  
    return user;
  }

  async getByEmail(email: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (user) {
      return user;
    }
    throw new HttpException('User with this email does not exist', HttpStatus.NOT_FOUND);
  }

  async findByEmail(email: string) {
    return await this.usersRepository.findOne({ where: { email }});
  }
 
  async create(userData: CreateUserDto) {
    const newUser = await this.usersRepository.create(userData);
    await this.usersRepository.save(newUser);
    return newUser;
  }

  async update(id: string, userData: UpdateUserDto) {
    await this.usersRepository.update(id, userData);
    return this.getById(id);
  }

  async delete(id: string) {
    const user = await this.usersRepository.findOne({where: {id}});
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    await this.usersRepository.delete(id);
    return {message: 'User deleted'};
  }

  async changePassword(id: string, passwordData: ChangePasswordDto) {
    const user = await this.usersRepository.findOne({ where: { id } });
  
    if (!user) {
      throw new HttpException(
        'User with this id does not exist',
        HttpStatus.NOT_FOUND,
      );
    }
    
    if (!user.password) {
      throw new HttpException(
        'User does not have a password',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      passwordData.currentPassword,
      user.password,
    );
  
    if (!isPasswordValid) {
      throw new HttpException(
        'Current password is incorrect',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isSamePassword = await bcrypt.compare(
      passwordData.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new HttpException(
        'New password cannot be the same as the current password',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    const hashedPassword = await bcrypt.hash(passwordData.newPassword, 10);
  
    await this.usersRepository.update(id, {
      password: hashedPassword,
    });
  }

  async setCurrentRefreshToken(refreshToken: string, userId: string) {
    const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(userId, {
      currentHashedRefreshToken
    });
  }

  async removeRefreshToken(userId: string) {
    await this.usersRepository.update(
      { id: userId },
      { currentHashedRefreshToken: null },
    );
  }

  async updateEmailVerification(
    userId: string,
    code: string,
    expiresAt: Date,
  ) {
    await this.usersRepository.update(userId, {
      emailVerificationCode: code,
      emailVerificationCodeExpiresAt: expiresAt,
    });
  }
  
  async verifyEmail(userId: string) {
    await this.usersRepository.update(userId, {
      isEmailVerified: true,
      emailVerificationCode: null,
      emailVerificationCodeExpiresAt: null,
    });
  }

  async getByGoogleId(googleId: string) {
    return await this.usersRepository.findOne({
      where: { googleId },
    });
  }
  
  async createGoogleUser(userData: {
    googleId: string;
    email: string;
    name: string;
  }) {
    const newUser = this.usersRepository.create({
      ...userData,
      password: null,
      isEmailVerified: true,
    });
  
    return await this.usersRepository.save(newUser);
  }

  async requestEmailChange(userId: string, emailData: ChangeEmailDto) {
    const user = await this.getById(userId);
  
    const newEmail = emailData.newEmail.trim().toLowerCase();
  
    if (newEmail === user.email.toLowerCase()) {
      throw new HttpException(
        'New email is the same as current email',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    const existingUser = await this.findByEmail(newEmail);
  
    if (existingUser) {
      throw new HttpException(
        'This email is already in use',
        HttpStatus.CONFLICT,
      );
    }
  
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
    await this.usersRepository.update(userId, {
      pendingEmail: newEmail,
      pendingEmailVerificationCode: code,
      pendingEmailVerificationCodeExpiresAt: expiresAt,
    });
  
    await this.mailService.sendVerificationEmail(newEmail, code);
  
    return {
      message: 'Verification code sent to new email',
    };
  }
  
  async verifyEmailChange(userId: string, codeData: VerifyEmailChangeDto) {
    const user = await this.getById(userId);
  
    if (!user.pendingEmail || !user.pendingEmailVerificationCode) {
      throw new HttpException(
        'Email change was not requested',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    if (
      !user.pendingEmailVerificationCodeExpiresAt ||
      user.pendingEmailVerificationCodeExpiresAt < new Date()
    ) {
      throw new HttpException(
        'Verification code has expired',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    if (user.pendingEmailVerificationCode !== codeData.code) {
      throw new HttpException(
        'Invalid verification code',
        HttpStatus.BAD_REQUEST,
      );
    }
  
    const existingUser = await this.findByEmail(user.pendingEmail);
  
    if (existingUser && existingUser.id !== userId) {
      throw new HttpException(
        'This email is already in use',
        HttpStatus.CONFLICT,
      );
    }
  
    await this.usersRepository.update(userId, {
      email: user.pendingEmail,
      isEmailVerified: true,
      pendingEmail: null,
      pendingEmailVerificationCode: null,
      pendingEmailVerificationCodeExpiresAt: null,
    });
  
    return {
      message: 'Email changed successfully',
    };
  }

  async updateAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Avatar file was not provided.');
    }
  
    const user = await this.getById(userId);
  
    const fileName = `avatars/${userId}/avatar.webp`;
  
    await this.storageService.uploadFile(
      fileName,
      file.buffer,
      file.mimetype,
    );
  
    const publicUrl = this.configService.get<string>('R2_PUBLIC_URL');
  
    const avatarUrl = `${publicUrl}/${fileName}`;
  
    await this.usersRepository.update(userId, {
      avatarUrl,
    });
  
    return {
      avatarUrl,
    };
  }

  async removeAvatar(userId: string) {
    const user = await this.getById(userId);
  
    if (!user.avatarUrl) {
      return {
        message: 'Something went wrong. Avatar not found',
      };
    }
  
    const fileName = `avatars/${userId}/avatar.webp`;
  
    await this.storageService.deleteFile(fileName);
  
    await this.usersRepository.update(userId, {
      avatarUrl: null,
    });
  
    return {
      message: 'Avatar removed successfully',
    };
  }

  async getByGithubId(githubId: string) {
    return await this.usersRepository.findOne({
      where: { githubId },
    });
  }
  
  async createGithubUser(userData: {
    githubId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  }) {
    const newUser = this.usersRepository.create({
      ...userData,
      password: null,
      isEmailVerified: true,
    });
  
    return await this.usersRepository.save(newUser);
  }

  async requestPasswordChange(userId: string) {
    const user = await this.getById(userId);
  
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
    await this.usersRepository.update(userId, {
      passwordChangeCode: code,
      passwordChangeCodeExpiresAt: expiresAt,
    });
  
    await this.mailService.sendVerificationEmail(user.email, code);
  
    return {
      message: 'Verification code sent to your email',
    };
  }
  
  async verifyPasswordChange(
    userId: string,
    passwordData: VerifyPasswordChangeDto,
  ) {
    const user = await this.getById(userId);
  
    if (!user.passwordChangeCode || !user.passwordChangeCodeExpiresAt) {
      throw new BadRequestException('Password change was not requested');
    }
  
    if (user.passwordChangeCodeExpiresAt < new Date()) {
      throw new BadRequestException('Verification code has expired');
    }
  
    if (user.passwordChangeCode !== passwordData.code) {
      throw new BadRequestException('Invalid verification code');
    }
  
    if (user.password) {
      const isSamePassword = await bcrypt.compare(
        passwordData.newPassword,
        user.password,
      );
  
      if (isSamePassword) {
        throw new BadRequestException(
          'New password cannot be the same as the current password',
        );
      }
    }
  
    const hashedPassword = await bcrypt.hash(passwordData.newPassword, 10);
  
    await this.usersRepository.update(userId, {
      password: hashedPassword,
      passwordChangeCode: null,
      passwordChangeCodeExpiresAt: null,
    });
  
    return {
      message: 'Password changed successfully',
    };
  }

  
  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findByEmail(normalizedEmail);
  
    if (!user || !user.isEmailVerified) {
      return {
        message: 'If the account exists, a verification code has been sent.',
      };
    }
  
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  
    await this.usersRepository.update(user.id, {
      passwordResetCode: code,
      passwordResetCodeExpiresAt: expiresAt,
    });
  
    await this.mailService.sendVerificationEmail(user.email, code);
  
    return {
      message: 'If the account exists, a verification code has been sent.',
    };
  }
  
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findByEmail(normalizedEmail);
  
    if (!user || !user.isEmailVerified) {
      throw new BadRequestException('Invalid or expired verification code');
    }
  
    if (!user.passwordResetCode || !user.passwordResetCodeExpiresAt) {
      throw new BadRequestException('Invalid or expired verification code');
    }
  
    if (
      user.passwordResetCode !== code ||
      user.passwordResetCodeExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }
  
    if (user.password) {
      const isSamePassword = await bcrypt.compare(
        newPassword,
        user.password,
      );
  
      if (isSamePassword) {
        throw new BadRequestException(
          'New password must be different from the previous password',
        );
      }
    }
  
    const hashedPassword = await bcrypt.hash(newPassword, 10);
  
    await this.usersRepository.update(user.id, {
      password: hashedPassword,
      passwordResetCode: null,
      passwordResetCodeExpiresAt: null,
      currentHashedRefreshToken: null,
    });
  
    return {
      message: 'Password reset successfully',
    };
  }
}
