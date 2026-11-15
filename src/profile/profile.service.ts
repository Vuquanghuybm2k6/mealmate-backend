import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserProfileView {
  name: string;
  email: string;
  phone: string;
  birthday: string;
  address: string;
  tier: string;
  stats: {
    saved: number;
    orders: number;
    rating: number;
    likes: number;
  };
}

export interface OrderHistoryView {
  id: string;
  date: string;
  items: string;
  total: number;
  status: 'Đang giao' | 'Hoàn thành' | 'Đã hủy';
}

export interface SavedRecipeView {
  id: string;
  title: string;
  meta: string;
  emoji: string;
}

export interface ReviewView {
  id: string;
  title: string;
  stars: number;
  note: string;
}

@Injectable()
export class ProfileService {
  // In-memory user profile cache/state for demo
  private profileStore = new Map<string, Partial<UserProfileView>>();

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfileView> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        _count: {
          select: {
            favoriteRecipes: true,
            shoppingLists: true,
            mealLogs: true,
          },
        },
      },
    });

    const custom = this.profileStore.get(userId) || {};

    const savedCount = user?._count.favoriteRecipes || 24;
    const ordersCount = user?._count.shoppingLists || 12;

    return {
      name: custom.name || user?.name || 'Nguyễn Minh Anh',
      email: custom.email || user?.email || 'minhanh2804@gmail.com',
      phone: custom.phone || '0987 654 321',
      birthday: custom.birthday || '2004-04-28',
      address: custom.address || 'Hà Nội, Việt Nam',
      tier: 'Thành viên Bạc',
      stats: {
        saved: savedCount,
        orders: ordersCount,
        rating: 4.8,
        likes: 56,
      },
    };
  }

  async updateProfile(
    userId: string,
    dto: Partial<UserProfileView>,
  ): Promise<UserProfileView> {
    const current = await this.getProfile(userId);
    const updated = { ...current, ...dto };
    this.profileStore.set(userId, updated);

    // Also update in Prisma if possible
    try {
      if (dto.name || dto.email) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            name: dto.name || undefined,
            email: dto.email || undefined,
          },
        });
      }
    } catch {
      // Fallback to store
    }

    return updated;
  }

  async getOrders(userId: string): Promise<OrderHistoryView[]> {
    return [
      {
        id: '#BSV1024',
        date: '14/11/2026',
        items: 'Rau củ quả, Thịt gà, Cá hồi',
        total: 287000,
        status: 'Đang giao',
      },
      {
        id: '#BSV0987',
        date: '07/11/2026',
        items: 'Trứng gà, Cà chua, Cải thảo',
        total: 98000,
        status: 'Hoàn thành',
      },
      {
        id: '#BSV0911',
        date: '29/10/2026',
        items: 'Thịt bò, Ớt chuông, Hành tây',
        total: 165000,
        status: 'Hoàn thành',
      },
    ];
  }

  async getSavedRecipes(userId: string): Promise<SavedRecipeView[]> {
    const favs = await this.prisma.favoriteRecipe.findMany({
      where: { userId },
      include: { recipe: true },
      take: 6,
    });

    if (favs.length > 0) {
      return favs.map((f) => ({
        id: f.recipe.id,
        title: f.recipe.title,
        meta: `${f.recipe.cookMinutes} phút • ${Math.round(f.recipe.kcal)} kcal`,
        emoji: '🍲',
      }));
    }

    return [
      { id: 'r1', title: 'Phở bò truyền thống', meta: '45 phút • 420 kcal', emoji: '🍜' },
      { id: 'r2', title: 'Tôm xào bông cải xanh', meta: '20 phút • 180 kcal', emoji: '🍤' },
      { id: 'r4', title: 'Cơm chiên trứng', meta: '15 phút • 350 kcal', emoji: '🍚' },
    ];
  }

  async getReviews(userId: string): Promise<ReviewView[]> {
    return [
      { id: 'v1', title: 'Canh sườn ngô ngọt', stars: 5, note: 'Nước ngọt thanh, rất dễ nấu!' },
      { id: 'v2', title: 'Gà kho gừng', stars: 4, note: 'Đưa cơm, lần sau mình bớt mặn.' },
    ];
  }
}
