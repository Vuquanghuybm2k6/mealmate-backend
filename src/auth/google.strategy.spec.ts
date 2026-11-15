import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Profile } from 'passport-google-oauth20';
import { GoogleStrategy } from './google.strategy';
import { AuthService } from './auth.service';
import { TEST_CONFIG } from '../test-support/fixtures';
import { InMemoryUserRepository } from '../test-support/in-memory-repositories';

function createStrategy() {
  const userRepository = new InMemoryUserRepository();
  const authService = new AuthService(
    userRepository,
    { signAsync: jest.fn() } as unknown as JwtService,
    TEST_CONFIG,
  );

  return {
    strategy: new GoogleStrategy(TEST_CONFIG, authService),
    userRepository,
  };
}

function googleProfile(overrides: Record<string, unknown> = {}): Profile {
  return {
    id: 'google-123',
    displayName: 'Nguyễn Văn A',
    emails: [{ value: 'a@gmail.com' }],
    photos: [{ value: 'https://example.com/a.png' }],
    ...overrides,
  } as unknown as Profile;
}

describe('GoogleStrategy', () => {
  it('map profile Google sang user và lưu vào repository', async () => {
    const { strategy, userRepository } = createStrategy();

    const user = await strategy.validate(
      'access-token',
      'refresh-token',
      googleProfile(),
    );

    expect(user).toMatchObject({
      id: 'user-1',
      googleId: 'google-123',
      email: 'a@gmail.com',
      name: 'Nguyễn Văn A',
      avatarUrl: 'https://example.com/a.png',
    });
    expect(userRepository.snapshot()).toHaveLength(1);
  });

  it('dùng email làm tên dự phòng khi Google không có displayName', async () => {
    const { strategy } = createStrategy();

    const user = await strategy.validate(
      'access-token',
      'refresh-token',
      googleProfile({ displayName: undefined }),
    );

    expect(user.name).toBe('a');
  });

  it('báo 401 khi Google không trả về email', async () => {
    const { strategy } = createStrategy();

    await expect(
      strategy.validate(
        'access-token',
        'refresh-token',
        googleProfile({ emails: [] }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
