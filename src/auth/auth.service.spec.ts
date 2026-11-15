import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { TEST_CONFIG, makeUser } from '../test-support/fixtures';
import { InMemoryUserRepository } from '../test-support/in-memory-repositories';

function createHarness(users = [] as ReturnType<typeof makeUser>[]) {
  const userRepository = new InMemoryUserRepository(users);
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
  } as unknown as JwtService;

  return {
    service: new AuthService(userRepository, jwtService, TEST_CONFIG),
    userRepository,
    jwtService,
  };
}

describe('AuthService', () => {
  it('tạo user mới từ Google, chuẩn hoá email và phát JWT', async () => {
    const { service, userRepository, jwtService } = createHarness();

    const user = await service.resolveGoogleUser({
      googleId: 'google-123',
      email: '  Sinh.Vien@Gmail.com ',
      name: '  Nguyễn Văn A ',
      avatarUrl: ' https://example.com/a.png ',
    });

    expect(user).toMatchObject({
      id: 'user-1',
      googleId: 'google-123',
      email: 'sinh.vien@gmail.com',
      name: 'Nguyễn Văn A',
      avatarUrl: 'https://example.com/a.png',
    });

    const result = await service.login(user);

    expect(result).toEqual({
      accessToken: 'signed.jwt.token',
      tokenType: 'Bearer',
      expiresIn: '7d',
      user: {
        id: 'user-1',
        email: 'sinh.vien@gmail.com',
        name: 'Nguyễn Văn A',
        avatarUrl: 'https://example.com/a.png',
      },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'sinh.vien@gmail.com',
    });
    expect(userRepository.snapshot()).toHaveLength(1);
  });

  it('đăng nhập lại bằng googleId thì cập nhật hồ sơ, không tạo trùng', async () => {
    const { service, userRepository } = createHarness();

    const first = await service.resolveGoogleUser({
      googleId: 'google-123',
      email: 'a@gmail.com',
      name: 'Tên cũ',
      avatarUrl: null,
    });
    const second = await service.resolveGoogleUser({
      googleId: 'google-123',
      email: 'a@gmail.com',
      name: 'Tên mới',
      avatarUrl: 'https://example.com/new.png',
    });

    expect(second.id).toBe(first.id);
    expect(second.name).toBe('Tên mới');
    expect(second.avatarUrl).toBe('https://example.com/new.png');
    expect(userRepository.snapshot()).toHaveLength(1);
  });

  it('liên kết googleId vào user đã tồn tại cùng email', async () => {
    const existing = makeUser({
      id: 'demo-user',
      email: 'demo@bepsv.local',
      name: 'Sinh viên demo',
    });
    const { service, userRepository } = createHarness([existing]);

    const user = await service.resolveGoogleUser({
      googleId: 'google-demo',
      email: 'demo@bepsv.local',
      name: 'Sinh viên Google',
      avatarUrl: null,
    });

    expect(user.id).toBe('demo-user');
    expect(user.googleId).toBe('google-demo');
    expect(user.name).toBe('Sinh viên Google');
    expect(userRepository.snapshot()).toHaveLength(1);
  });

  it('lấy tên từ phần trước @ khi Google không trả về tên', async () => {
    const { service } = createHarness();

    const user = await service.resolveGoogleUser({
      googleId: 'google-123',
      email: 'sinhvien@example.com',
      name: '   ',
      avatarUrl: null,
    });

    expect(user.name).toBe('sinhvien');
  });

  it('từ chối profile thiếu email hoặc googleId', async () => {
    const { service } = createHarness();

    await expect(
      service.resolveGoogleUser({
        googleId: 'google-123',
        email: null,
        name: 'Không có email',
        avatarUrl: null,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    await expect(
      service.resolveGoogleUser({
        googleId: '',
        email: 'a@gmail.com',
        name: 'Thiếu id',
        avatarUrl: null,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('trả hồ sơ hiện tại và báo 401 nếu user không tồn tại', async () => {
    const { service } = createHarness([
      makeUser({ id: 'demo-user', email: 'demo@bepsv.local' }),
    ]);

    await expect(service.getProfile('demo-user')).resolves.toEqual({
      id: 'demo-user',
      email: 'demo@bepsv.local',
      name: 'Sinh viên demo',
      avatarUrl: null,
    });
    await expect(service.getProfile('missing')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('chỉ báo Google đã cấu hình khi có đủ client id và secret', () => {
    expect(createHarness().service.isGoogleConfigured).toBe(false);

    const configured = new AuthService(
      new InMemoryUserRepository(),
      { signAsync: jest.fn() } as unknown as JwtService,
      {
        ...TEST_CONFIG,
        googleClientId: 'client-id',
        googleClientSecret: 'client-secret',
      },
    );

    expect(configured.isGoogleConfigured).toBe(true);
  });
});
