import {
  Controller,
  Get,
  Inject,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { UserEntity } from '../domain/entities';
import { GoogleAuthGuard, JwtAuthGuard } from './auth.guards';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './types';

interface GoogleCallbackRequest extends Request {
  user: UserEntity;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(APP_CONFIG)
    private readonly config: AppConfig,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  google(): void {
    // GoogleAuthGuard đã redirect sang Google, không chạy tới đây.
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() request: GoogleCallbackRequest,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.authService.login(request.user);
    // Dùng fragment (#) để token không nằm trong log server / Referer header.
    const redirectUrl = new URL('/auth/callback', this.config.frontendUrl);
    redirectUrl.hash = new URLSearchParams({
      access_token: result.accessToken,
      token_type: result.tokenType,
      expires_in: result.expiresIn,
    }).toString();

    response.redirect(redirectUrl.toString());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUserId() userId: string): Promise<AuthenticatedUser> {
    return this.authService.getProfile(userId);
  }
}
