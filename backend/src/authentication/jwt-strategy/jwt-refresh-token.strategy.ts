import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { StrategyOptionsWithRequest } from 'passport-jwt';

import { UsersService } from '../../users/users.service';
import { TokenPayload } from '../interfaces/tokenPayload.interface';

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const secret = configService.get<string>('JWT_REFRESH_TOKEN_SECRET');

    if (!secret) {
      throw new Error('JWT_REFRESH_TOKEN_SECRET is not defined');
    }

    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.Refresh,
      ]),
      secretOrKey: secret,
      passReqToCallback: true,
    };

    super(options);
  }

  async validate(request: Request, payload: TokenPayload) {
    const refreshToken = request.cookies?.Refresh;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const user = await this.usersService.getUserIfRefreshTokenMatches(
      refreshToken,
      payload.userId,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return user;
  }
}
