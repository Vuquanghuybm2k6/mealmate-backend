import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { UserEntity } from '../domain/entities';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(APP_CONFIG) config: AppConfig,
    private readonly authService: AuthService,
  ) {
    super({
      // Giá trị giả chỉ để Passport khởi tạo được khi chưa cấu hình OAuth.
      // GoogleAuthGuard sẽ chặn route và trả 503 trước khi redirect thật.
      clientID: config.googleClientId ?? 'google-oauth-client-id-missing',
      clientSecret:
        config.googleClientSecret ?? 'google-oauth-client-secret-missing',
      callbackURL: config.googleCallbackUrl,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<UserEntity> {
    return this.authService.resolveGoogleUser({
      googleId: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      name: profile.displayName ?? '',
      avatarUrl: profile.photos?.[0]?.value ?? null,
    });
  }
}
