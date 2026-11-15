import { Injectable } from '@nestjs/common';
import { Streak } from '@prisma/client';
import { StreakEntity } from '../../domain/entities';
import {
  StreakRepository,
  StreakUpdate,
} from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaStreakRepository implements StreakRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<StreakEntity | null> {
    const streak = await this.prisma.streak.findUnique({ where: { userId } });

    return streak ? this.mapStreak(streak) : null;
  }

  async upsert(
    userId: string,
    data: StreakUpdate,
  ): Promise<StreakEntity> {
    const streak = await this.prisma.streak.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return this.mapStreak(streak);
  }

  private mapStreak(streak: Streak): StreakEntity {
    return {
      userId: streak.userId,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastDate: streak.lastDate,
    };
  }
}
