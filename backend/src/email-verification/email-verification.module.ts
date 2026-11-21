import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { MailModule } from '../mail/mail.module.js';
import { EmailVerificationService } from './email-verification.service.js';

@Module({
  imports: [
    UsersModule,
    MailModule,
  ],
  providers: [EmailVerificationService],
  exports: [EmailVerificationService],
})
export class EmailVerificationModule {}