import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { GoogleAuthGuard, OptionalJwtAuthGuard } from './auth.guards';
import { TEST_CONFIG } from '../test-support/fixtures';

function contextWithHeaders(
  headers: Record<string, string | undefined>,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('auth guards', () => {
  it('GoogleAuthGuard trả 503 khi chưa cấu hình OAuth', () => {
    const guard = new GoogleAuthGuard(TEST_CONFIG);

    expect(() => guard.canActivate(contextWithHeaders({}))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('OptionalJwtAuthGuard cho request không có Bearer token đi tiếp', () => {
    const guard = new OptionalJwtAuthGuard();

    expect(guard.canActivate(contextWithHeaders({}))).toBe(true);
    expect(
      guard.canActivate(contextWithHeaders({ authorization: 'Basic abc' })),
    ).toBe(true);
  });

  it('OptionalJwtAuthGuard chuyển cho passport khi có Bearer token', async () => {
    const guard = new OptionalJwtAuthGuard();

    // Không có request/response thật nên passport sẽ báo lỗi context;
    // điều cần kiểm tra là guard không tự ý cho qua khi có token.
    await expect(
      guard.canActivate(
        contextWithHeaders({ authorization: 'Bearer invalid' }),
      ),
    ).rejects.toBeDefined();
  });
});
