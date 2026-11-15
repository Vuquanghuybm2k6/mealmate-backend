import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DEFAULT_USER_ID } from '../../config/app-config';

export interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user?: { id?: string };
}

/**
 * Ưu tiên user từ JWT (req.user.id), sau đó fallback header x-user-id trong
 * giai đoạn dev, cuối cùng là user demo.
 */
export function resolveCurrentUserId(request: RequestWithUser): string {
  const headerValue = request.headers['x-user-id'];
  const userId = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  return (request.user?.id ?? userId?.trim()) || DEFAULT_USER_ID;
}

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    resolveCurrentUserId(context.switchToHttp().getRequest<RequestWithUser>()),
);
