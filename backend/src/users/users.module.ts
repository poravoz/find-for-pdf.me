import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import User from './entities/users.entity';
import { UsersController } from './users.controller';
import { MailModule } from '../mail/mail.module.js';
import { StorageService } from '../chat/storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    MailModule,
  ],
  providers: [UsersService, StorageService],
  exports: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
