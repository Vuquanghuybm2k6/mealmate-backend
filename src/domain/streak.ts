import { StreakEntity } from './entities';

export interface StreakBadge {
  key: string;
  label: string;
}

export interface StreakView {
  currentStreak: number;
  longestStreak: number;
  lastDate: string | null;
  badge: StreakBadge;
  message: string;
}

export function emptyStreak(userId: string): StreakEntity {
  return {
    userId,
    currentStreak: 0,
    longestStreak: 0,
    lastDate: null,
  };
}

export function streakBadge(currentStreak: number): StreakBadge {
  if (currentStreak >= 30) {
    return { key: 'legend', label: 'Huyền thoại bếp núc' };
  }

  if (currentStreak >= 14) {
    return { key: 'master', label: 'Bậc thầy ăn ngoan' };
  }

  if (currentStreak >= 7) {
    return { key: 'star', label: 'Siêu sao 7 ngày' };
  }

  if (currentStreak >= 3) {
    return { key: 'steady', label: 'Đều đặn ghê' };
  }

  if (currentStreak >= 1) {
    return { key: 'starter', label: 'Khởi động tốt' };
  }

  return { key: 'new', label: 'Bắt đầu hôm nay' };
}

export function streakMessage(currentStreak: number): string {
  if (currentStreak >= 30) {
    return 'Một tháng ăn đủ bữa! Bạn đang là huyền thoại của BếpSV.';
  }

  if (currentStreak >= 7) {
    return 'Chuỗi 7 ngày ăn đủ bữa, ví và sức khoẻ đều vui!';
  }

  if (currentStreak >= 3) {
    return 'Ba ngày ăn ngoan rồi, cố giữ nhịp nhé!';
  }

  if (currentStreak >= 1) {
    return 'Một ngày ăn đủ bữa là một ngày chiến thắng!';
  }

  return 'Ghi nhận đủ 3 bữa hôm nay để bắt đầu chuỗi ngày ăn ngoan.';
}

export function toStreakView(
  streak: StreakEntity | null,
  userId: string,
  message?: string,
): StreakView {
  const value = streak ?? emptyStreak(userId);

  return {
    currentStreak: value.currentStreak,
    longestStreak: value.longestStreak,
    lastDate: value.lastDate,
    badge: streakBadge(value.currentStreak),
    message: message ?? streakMessage(value.currentStreak),
  };
}
