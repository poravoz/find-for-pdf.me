import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PostgresErrorCode } from '../database/postgresErrorCodes.enum';
import RegisterDto from './dto/register.dto';
import type { TokenPayload } from './interfaces/tokenPayload.interface';
import { EmailVerificationService } from '../email-verification/email-verification.service.js';
import type { StringValue } from 'ms';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailVerificationService: EmailVerificationService,  ) {}

    public async register(registrationData: RegisterDto) {
      try {
        const hashedPassword = await bcrypt.hash(
          registrationData.password,
          10,
        );
    
        const user = await this.usersService.create({
          ...registrationData,
          password: hashedPassword,
        });
    
        await this.emailVerificationService.sendVerificationCode(user);
    
        return {
          message: 'Registration successful. Please verify your email.',
        };
      } catch (error) {
        if (
          (error as { code?: string })?.code ===
          PostgresErrorCode.UniqueViolation
        ) {
          throw new HttpException(
            'User with that email already exists',
            HttpStatus.BAD_REQUEST,
          );
        }
    
        throw error;
      }
    }

    public async getAuthenticatedUser(
      email: string,
      plainTextPassword: string,
    ) {
      let user;
    
      try {
        user = await this.usersService.getByEmail(email);
    
        if (!user.password) {
          throw new Error('Password not found');
        }
    
        await this.verifyPassword(
          plainTextPassword,
          user.password,
        );
      } catch {
        throw new HttpException(
          'Wrong credentials provided',
          HttpStatus.BAD_REQUEST,
        );
      }
    
      if (!user.isEmailVerified) {
        throw new HttpException(
          'Please verify your email before logging in',
          HttpStatus.FORBIDDEN,
        );
      }
    
      return user;
    }

  private async verifyPassword(plainTextPassword: string, hashedPassword: string) {
    const isPasswordMatching = await bcrypt.compare(plainTextPassword, hashedPassword);

    if (!isPasswordMatching) {
      throw new HttpException('Wrong credentials provided', HttpStatus.BAD_REQUEST);
    }
  }

  public getCookieWithJwtAccessToken(userId: string) {
    const payload: TokenPayload = { userId };
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_TOKEN_SECRET'),
      expiresIn: `${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}s`
    });
    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME')}`;
  }
 

  public getCookieWithJwtRefreshToken(
    userId: string,
    rememberMe = false,
  ) {
    const payload: TokenPayload = { userId };
  
    const refreshTokenExpiration: number | StringValue = rememberMe
      ? '30d'
      : (this.configService.get<string>(
          'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
        ) as StringValue);
  
    if (!refreshTokenExpiration) {
      throw new Error('Invalid refresh token expiration time');
    }
  
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: refreshTokenExpiration,
    });
  
    const cookie = rememberMe
      ? `Refresh=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}`
      : `Refresh=${token}; HttpOnly; Path=/`;
  
    return {
      cookie,
      token,
    };
  }

  public getCookiesForLogOut() {
    return [
      'Authentication=; HttpOnly; Path=/; Max-Age=0',
      'Refresh=; HttpOnly; Path=/; Max-Age=0'
    ];
  }

  public async getAuthenticatedGoogleUser(googleUser: {
    googleId: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
  }) {
    let user = await this.usersService.getByGoogleId(
      googleUser.googleId,
    );
  
    if (user) {
      return user;
    }
  
    user = await this.usersService.findByEmail(googleUser.email);
  
    if (user) {
      throw new HttpException(
        'An account with this email already exists. Please log in using your email and password.',
        HttpStatus.CONFLICT,
      );
    }
  
    return this.usersService.createGoogleUser({
      googleId: googleUser.googleId,
      email: googleUser.email,
      name: googleUser.name,
    });
  }

  public async getAuthenticatedGithubUser(githubUser: {
    githubId: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  }) {
    let user = await this.usersService.getByGithubId(
      githubUser.githubId,
    );
  
    if (user) {
      return user;
    }
  
    const existingUser = await this.usersService.findByEmail(
      githubUser.email,
    );
  
    if (existingUser) {
      throw new HttpException(
        'An account with this email already exists. Please log in using your existing account.',
        HttpStatus.CONFLICT,
      );
    }
  
    return this.usersService.createGithubUser({
      githubId: githubUser.githubId,
      email: githubUser.email,
      name: githubUser.name,
      avatarUrl: githubUser.avatarUrl,
    });
  }

  public async verifyEmailAndLogin(
    email: string,
    code: string,
  ) {
    const user = await this.emailVerificationService.verifyEmail(
      email,
      code,
    );
  
    const accessTokenCookie =
      this.getCookieWithJwtAccessToken(user.id);
  
    const {
      cookie: refreshTokenCookie,
      token: refreshToken,
    } = this.getCookieWithJwtRefreshToken(user.id);
  
    await this.usersService.setCurrentRefreshToken(
      refreshToken,
      user.id,
    );
  
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      },
      cookies: [
        accessTokenCookie,
        refreshTokenCookie,
      ],
    };
  }
}
