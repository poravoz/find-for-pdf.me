import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import User from '../users/entities/users.entity';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  public async sendVerificationCode(user: User) {
    const code = randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.usersService.updateEmailVerification(
      user.id,
      code,
      expiresAt,
    );

    await this.mailService.sendVerificationEmail(
      user.email,
      code,
    );
  }

  public async verifyEmail(email: string, code: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new HttpException(
        'User not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (user.isEmailVerified) {
      throw new HttpException(
        'Email already verified',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      user.emailVerificationCode !== code ||
      !user.emailVerificationCodeExpiresAt ||
      user.emailVerificationCodeExpiresAt < new Date()
    ) {
      throw new HttpException(
        'Invalid or expired verification code',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.usersService.verifyEmail(user.id);

    user.isEmailVerified = true;
    
    return user;
  }
}
