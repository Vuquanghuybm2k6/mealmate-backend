import {
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../config/app-config';

type GuardResult = boolean | Promise<boolean> | Observable<boolean>;

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(
    @Inject(APP_CONFIG)
    private readonly config: AppConfig,
  ) {
    super();
  }

  canActivate(context: ExecutionContext): GuardResult {
    if (!this.config.googleClientId || !this.config.googleClientSecret) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET',
      );
    }

    return super.canActivate(context);
  }
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/**
 * Cho phép request không có Bearer token đi tiếp (giai đoạn chuyển từ header
 * x-user-id sang JWT). Nếu có Bearer token thì bắt buộc phải hợp lệ.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): GuardResult {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return true;
    }

    return super.canActivate(context);
  }
}
