import { Body, Req, Controller, HttpCode, Post, UseGuards, Get, UnauthorizedException } from '@nestjs/common';;
import { AuthenticationService } from './authentication.service';
import RegisterDto from './dto/register.dto';
import type { RequestWithUser } from './interfaces/requestWithUser.interface';
import JwtRefreshGuard from './jwt-strategy/jwt-refresh.guard';
import { UsersService } from '../users/users.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { GoogleAuthenticationGuard } from './jwt-strategy/google-authentication.guard.js';
import { Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import type { GoogleUser } from './interfaces/googleUser.interface.js';
import { GithubAuthenticationGuard } from './jwt-strategy/github-authentication.guard.js';
import { GithubUser } from './interfaces/github-user.interface';
import LogInDto from './dto/logIn.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly usersService: UsersService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() registrationData: RegisterDto) {
    return this.authenticationService.register(registrationData);
  }

  @HttpCode(200)
  @Post('log-in')
  async logIn(
    @Body() loginData: LogInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authenticationService.getAuthenticatedUser(
      loginData.email,
      loginData.password,
    );
  
    const accessTokenCookie =
      this.authenticationService.getCookieWithJwtAccessToken(user.id);
  
    const {
      cookie: refreshTokenCookie,
      token: refreshToken,
    } = this.authenticationService.getCookieWithJwtRefreshToken(
      user.id,
      loginData.rememberMe ?? false,
    );
  
    await this.usersService.setCurrentRefreshToken(
      refreshToken,
      user.id,
    );
  
    response.setHeader('Set-Cookie', [
      accessTokenCookie,
      refreshTokenCookie,
    ]);
  
    const {
      password,
      currentHashedRefreshToken,
      ...userWithoutSecrets
    } = user;
  
    return userWithoutSecrets;
  }

  @UseGuards(JwtRefreshGuard)
  @Post('log-out')
  @HttpCode(200)
  async logOut(@Req() request: RequestWithUser) {
    request.res!.setHeader(
      'Set-Cookie',
      this.authenticationService.getCookiesForLogOut(),
    );
  
    await this.usersService.removeRefreshToken(request.user.id);
  
    return { message: 'Logged out successfully' };
  }

  
  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ) {
    return this.usersService.requestPasswordReset(
      forgotPasswordDto.email,
    );
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.code,
      resetPasswordDto.newPassword,
    );
  }

  @UseGuards(JwtRefreshGuard)
  @Get()
  authenticate(@Req() request: RequestWithUser) {
    const user = request.user;
  
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
    };
  }

  @UseGuards(JwtRefreshGuard)
  @Get('refresh')
  refresh(@Req() request: RequestWithUser) {
    const accessTokenCookie = this.authenticationService.getCookieWithJwtAccessToken(request.user.id);
 
    request.res!.setHeader('Set-Cookie', accessTokenCookie);
    return request.user;
  }

  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authenticationService.verifyEmailAndLogin(
      verifyEmailDto.email,
      verifyEmailDto.code,
    );
  
    response.setHeader('Set-Cookie', result.cookies);
  
    return {
      message: 'Email successfully verified',
      user: result.user,
    };
  }

  @Get('google')
  @UseGuards(GoogleAuthenticationGuard)
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthenticationGuard)
  async googleAuthCallback(
    @Req() request: RequestWithUser,
    @Res() response: Response,
  ) {
    const user = await this.authenticationService.getAuthenticatedGoogleUser(
      request.user as GoogleUser,
    );
  
    const accessTokenCookie =
      this.authenticationService.getCookieWithJwtAccessToken(user.id);
  
    const {
      cookie: refreshTokenCookie,
      token: refreshToken,
    } = this.authenticationService.getCookieWithJwtRefreshToken(user.id);
  
    await this.usersService.setCurrentRefreshToken(
      refreshToken,
      user.id,
    );
  
    response.setHeader('Set-Cookie', [
      accessTokenCookie,
      refreshTokenCookie,
    ]);
  
    response.redirect(
      this.configService.get<string>('FRONTEND_URL')!,
    );
  }

  @Get('github')
  @UseGuards(GithubAuthenticationGuard)
  githubAuth() {}

  @Get('github/callback')
  @UseGuards(GithubAuthenticationGuard)
  async githubAuthCallback(
    @Req() request: RequestWithUser,
    @Res() response: Response,
  ) {
    const user = await this.authenticationService.getAuthenticatedGithubUser(
      request.user as GithubUser,
    );

    const accessTokenCookie =
      this.authenticationService.getCookieWithJwtAccessToken(user.id);

    const {
      cookie: refreshTokenCookie,
      token: refreshToken,
    } = this.authenticationService.getCookieWithJwtRefreshToken(user.id);

    await this.usersService.setCurrentRefreshToken(
      refreshToken,
      user.id,
    );

    response.setHeader('Set-Cookie', [
      accessTokenCookie,
      refreshTokenCookie,
    ]);

    response.redirect(
      this.configService.get<string>('FRONTEND_URL')!,
    );
  }
}
