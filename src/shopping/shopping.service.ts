import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ShoppingItemView {
  id: string;
  group: 'veg' | 'meat' | 'other';
  name: string;
  emoji: string;
  qty: string;
  price: number;
  done: boolean;
}

export interface ShoppingListView {
  id: string;
  totalCost: number;
  budget: number;
  plannedMeals: number;
  items: ShoppingItemView[];
}

const DEFAULT_SHOPPING_ITEMS: Array<{
  group: 'veg' | 'meat' | 'other';
  name: string;
  emoji: string;
  qty: string;
  price: number;
}> = [
  { group: 'veg', name: 'Rau muống', emoji: '🥬', qty: '~ 1 bó', price: 12000 },
  { group: 'veg', name: 'Cà chua', emoji: '🍅', qty: '~ 1kg', price: 18000 },
  { group: 'veg', name: 'Dưa leo', emoji: '🥒', qty: '~ 500g', price: 10000 },
  { group: 'veg', name: 'Cải thảo', emoji: '🥬', qty: '~ 1kg', price: 15000 },
  { group: 'veg', name: 'Ớt chuông', emoji: '🫑', qty: '~ 3 quả', price: 7000 },
  { group: 'meat', name: 'Thịt gà', emoji: '🍗', qty: '~ 1kg', price: 85000 },
  { group: 'meat', name: 'Cá hồi', emoji: '🐟', qty: '~ 500g', price: 95000 },
  { group: 'other', name: 'Trứng gà', emoji: '🥚', qty: '~ 1 vỉ (10 quả)', price: 40000 },
  { group: 'other', name: 'Hành lá', emoji: '🧅', qty: '~ 1 bó', price: 2000 },
  { group: 'other', name: 'Tỏi', emoji: '🧄', qty: '~ 1 củ', price: 2000 },
  { group: 'other', name: 'Muối i-ốt', emoji: '🧂', qty: '~ 1 gói', price: 1000 },
];

@Injectable()
export class ShoppingService {
  // In-memory fallback if user has no DB shopping list yet
  private userItems = new Map<string, ShoppingItemView[]>();

  constructor(private readonly prisma: PrismaService) {}

  private getItemsForUser(userId: string): ShoppingItemView[] {
    if (!this.userItems.has(userId)) {
      this.userItems.set(
        userId,
        DEFAULT_SHOPPING_ITEMS.map((item, i) => ({
          id: `s${i + 1}`,
          ...item,
          done: false,
        })),
      );
    }
    return this.userItems.get(userId)!;
  }

  async getCurrentList(userId: string): Promise<ShoppingListView> {
    // Check if user has shopping list in Prisma
    const dbList = await this.prisma.shoppingList.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { ingredient: true } },
      },
    });

    if (dbList && dbList.items.length > 0) {
      const items: ShoppingItemView[] = dbList.items.map((it) => {
        const cat = (it.ingredient?.category || '').toLowerCase();
        const group: 'veg' | 'meat' | 'other' =
          cat.includes('rau') || cat.includes('củ') || cat.includes('quả')
            ? 'veg'
            : cat.includes('thịt') || cat.includes('cá') || cat.includes('hải sản')
              ? 'meat'
              : 'other';

        return {
          id: it.id,
          group,
          name: it.ingredient?.name || 'Nguyên liệu',
          emoji: group === 'veg' ? '🥬' : group === 'meat' ? '🥩' : '🛒',
          qty: `~ ${it.quantity} ${it.ingredient?.unit || 'phần'}`,
          price: it.estPrice,
          done: it.isBought,
        };
      });

      const totalCost = items.reduce((sum, it) => sum + it.price, 0);

      return {
        id: dbList.id,
        totalCost,
        budget: dbList.budget || 250000,
        plannedMeals: 3,
        items,
      };
    }

    // Default list
    const items = this.getItemsForUser(userId);
    const totalCost = items.reduce((sum, it) => sum + it.price, 0);

    return {
      id: 'default-shopping-list',
      totalCost,
      budget: 250000,
      plannedMeals: 3,
      items,
    };
  }

  async addItem(
    userId: string,
    dto: { name: string; group?: string; qty?: string; price?: number; emoji?: string },
  ): Promise<ShoppingItemView> {
    const items = this.getItemsForUser(userId);
    const validGroup: 'veg' | 'meat' | 'other' =
      dto.group === 'veg' || dto.group === 'meat' ? dto.group : 'other';

    const newItem: ShoppingItemView = {
      id: `s-${Date.now()}`,
      group: validGroup,
      name: dto.name,
      emoji: dto.emoji || (validGroup === 'veg' ? '🥬' : validGroup === 'meat' ? '🥩' : '🛒'),
      qty: dto.qty || '~ 1 phần',
      price: dto.price || 15000,
      done: false,
    };

    items.push(newItem);
    return newItem;
  }

  async toggleItem(userId: string, itemId: string): Promise<ShoppingItemView> {
    const items = this.getItemsForUser(userId);
    const item = items.find((it) => it.id === itemId);
    if (!item) {
      // Also try DB item
      try {
        const dbItem = await this.prisma.shoppingItem.findUnique({
          where: { id: itemId },
          include: { ingredient: true },
        });
        if (dbItem) {
          const updated = await this.prisma.shoppingItem.update({
            where: { id: itemId },
            data: { isBought: !dbItem.isBought },
            include: { ingredient: true },
          });
          return {
            id: updated.id,
            group: 'other',
            name: updated.ingredient.name,
            emoji: '🛒',
            qty: `~ ${updated.quantity} ${updated.ingredient.unit}`,
            price: updated.estPrice,
            done: updated.isBought,
          };
        }
      } catch {
        // Fall through
      }
      throw new NotFoundException('Không tìm thấy món trong danh sách');
    }

    item.done = !item.done;
    return item;
  }

  async removeItem(userId: string, itemId: string): Promise<{ success: boolean }> {
    const items = this.getItemsForUser(userId);
    const idx = items.findIndex((it) => it.id === itemId);
    if (idx !== -1) {
      items.splice(idx, 1);
      return { success: true };
    }

    try {
      await this.prisma.shoppingItem.delete({ where: { id: itemId } });
      return { success: true };
    } catch {
      return { success: true };
    }
  }

  async getRecentLists(userId: string): Promise<Array<{ id: string; title: string; sub: string }>> {
    return [
      { id: 'today', title: 'Danh sách hôm nay', sub: '12 món • 245.000đ' },
      { id: 'lastweek', title: 'Danh sách tuần trước', sub: '14 món • 320.000đ' },
    ];
  }
}
