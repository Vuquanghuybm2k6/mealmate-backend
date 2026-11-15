import { resolveCurrentUserId } from './current-user-id.decorator';

describe('resolveCurrentUserId', () => {
  it('ưu tiên req.user.id khi request đã có JWT', () => {
    expect(
      resolveCurrentUserId({
        headers: { 'x-user-id': 'header-user' },
        user: { id: 'jwt-user' },
      }),
    ).toBe('jwt-user');
  });

  it('fallback sang header x-user-id trong giai đoạn dev', () => {
    expect(
      resolveCurrentUserId({ headers: { 'x-user-id': 'header-user' } }),
    ).toBe('header-user');
  });

  it('lấy phần tử đầu nếu header bị lặp', () => {
    expect(
      resolveCurrentUserId({ headers: { 'x-user-id': ['first', 'second'] } }),
    ).toBe('first');
  });

  it('dùng demo-user khi không có token và không có header', () => {
    expect(resolveCurrentUserId({ headers: {} })).toBe('demo-user');
    expect(
      resolveCurrentUserId({ headers: { 'x-user-id': '   ' } }),
    ).toBe('demo-user');
  });
});
