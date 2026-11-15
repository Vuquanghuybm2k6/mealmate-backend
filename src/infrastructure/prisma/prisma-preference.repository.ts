import { Injectable } from '@nestjs/common';
import { UserPreference } from '@prisma/client';
import {
  DietTypeValue,
} from '../../domain/enums';
import { UserPreferenceEntity } from '../../domain/entities';
import {
  PreferenceRepository,
  PreferenceUpdate,
} from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaPreferenceRepository implements PreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<UserPreferenceEntity | null> {
    const preference = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    return preference ? this.mapPreference(preference) : null;
  }

  async upsert(
    userId: string,
    data: PreferenceUpdate,
  ): Promise<UserPreferenceEntity> {
    const preference = await this.prisma.userPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return this.mapPreference(preference);
  }

  private mapPreference(
    preference: UserPreference,
  ): UserPreferenceEntity {
    return {
      userId: preference.userId,
      dietType: preference.dietType as DietTypeValue,
      spiceLevel: preference.spiceLevel,
      dislikedIngredientIds: preference.dislikedIngredientIds,
      calorieGoal: preference.calorieGoal,
      proteinGoal: preference.proteinGoal,
      defaultBudget: preference.defaultBudget,
      healthyMaxKcal: preference.healthyMaxKcal,
      healthyMinProtein: preference.healthyMinProtein,
    };
  }
}
