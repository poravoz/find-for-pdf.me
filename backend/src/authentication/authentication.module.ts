
import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { UsersModule } from '../users/users.module';
import { AuthenticationController } from './authentication.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtRefreshTokenStrategy } from './jwt-strategy/jwt-refresh-token.strategy';
import { MailModule } from '../mail/mail.module.js';
import { EmailVerificationModule } from '../email-verification/email-verification.module.js';
import { GoogleStrategy } from './jwt-strategy/google.strategy.js';
import { GithubStrategy } from './jwt-strategy/github.strategy.js';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    MailModule,
    EmailVerificationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_TOKEN_SECRET'),
        signOptions: {
          expiresIn: `${configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`,
        },
      }),
    }),
  ],
  providers: [AuthenticationService, JwtRefreshTokenStrategy, GoogleStrategy, GithubStrategy],
  controllers: [AuthenticationController]
})
export class AuthenticationModule {}
