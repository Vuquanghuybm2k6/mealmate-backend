import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { UserEntity } from '../domain/entities';
import { USER_REPOSITORY, UserRepository } from '../domain/repositories';
import {
  AuthenticatedUser,
  GoogleProfileInput,
  JwtPayload,
  LoginResult,
} from './types';

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    @Inject(APP_CONFIG)
    private readonly config: AppConfig,
  ) {}

  get isGoogleConfigured(): boolean {
    return Boolean(this.config.googleClientId && this.config.googleClientSecret);
  }

  async resolveGoogleUser(input: GoogleProfileInput): Promise<UserEntity> {
    const email = input.email?.trim().toLowerCase();

    if (!input.googleId) {
      throw new UnauthorizedException('Không xác định được tài khoản Google');
    }

    if (!email) {
      throw new UnauthorizedException(
        'Tài khoản Google không cung cấp email để đăng nhập',
      );
    }

    return this.userRepository.upsertGoogleUser({
      googleId: input.googleId,
      email,
      name: input.name.trim() || email.split('@')[0],
      avatarUrl: input.avatarUrl?.trim() || null,
    });
  }

  async login(user: UserEntity): Promise<LoginResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.jwtExpiresIn,
      user: this.toAuthenticatedUser(user),
    };
  }

  async getProfile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    return this.toAuthenticatedUser(user);
  }

  private toAuthenticatedUser(user: UserEntity): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }
}
