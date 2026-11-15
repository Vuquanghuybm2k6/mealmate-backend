import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { TEST_CONFIG, makeUser } from '../test-support/fixtures';
import { InMemoryUserRepository } from '../test-support/in-memory-repositories';

describe('JwtStrategy', () => {
  const user = makeUser({
    id: 'demo-user',
    email: 'demo@bepsv.local',
    googleId: 'google-demo',
  });

  it('trả user tương ứng với payload sub', async () => {
    const strategy = new JwtStrategy(
      TEST_CONFIG,
      new InMemoryUserRepository([user]),
    );

    await expect(
      strategy.validate({ sub: 'demo-user', email: 'demo@bepsv.local' }),
    ).resolves.toBe(user);
  });

  it('báo 401 khi token trỏ tới user không tồn tại', async () => {
    const strategy = new JwtStrategy(
      TEST_CONFIG,
      new InMemoryUserRepository([user]),
    );

    await expect(
      strategy.validate({ sub: 'missing', email: 'missing@bepsv.local' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('báo 401 khi payload thiếu sub', async () => {
    const strategy = new JwtStrategy(
      TEST_CONFIG,
      new InMemoryUserRepository([user]),
    );

    await expect(
      strategy.validate(undefined as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
