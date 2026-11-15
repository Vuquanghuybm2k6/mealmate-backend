import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TEST_CONFIG, makeUser } from '../test-support/fixtures';
import { InMemoryUserRepository } from '../test-support/in-memory-repositories';

function createHarness() {
  const user = makeUser({
    id: 'demo-user',
    email: 'demo@bepsv.local',
    name: 'Sinh viên demo',
  });
  const userRepository = new InMemoryUserRepository([user]);
  const authService = new AuthService(
    userRepository,
    {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
    } as unknown as JwtService,
    TEST_CONFIG,
  );

  return {
    controller: new AuthController(authService, TEST_CONFIG),
    user,
  };
}

describe('AuthController', () => {
  it('redirect về frontend với token nằm trong fragment', async () => {
    const { controller, user } = createHarness();
    const response = { redirect: jest.fn() } as unknown as Response;

    await controller.googleCallback({ user } as never, response);

    expect(response.redirect).toHaveBeenCalledTimes(1);

    const redirectUrl = new URL(
      (response.redirect as unknown as jest.Mock).mock.calls[0][0],
    );

    expect(redirectUrl.origin).toBe('http://localhost:5173');
    expect(redirectUrl.pathname).toBe('/auth/callback');
    expect(redirectUrl.search).toBe('');
    expect(redirectUrl.hash).toBe(
      '#access_token=signed.jwt.token&token_type=Bearer&expires_in=7d',
    );
  });

  it('trả hồ sơ của user hiện tại', async () => {
    const { controller, user } = createHarness();

    await expect(controller.me(user.id)).resolves.toEqual({
      id: 'demo-user',
      email: 'demo@bepsv.local',
      name: 'Sinh viên demo',
      avatarUrl: null,
    });
  });
});
