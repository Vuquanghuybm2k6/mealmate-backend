import { Injectable } from '@nestjs/common';
import { Prisma, PushSubscription } from '@prisma/client';
import { PushSubscriptionEntity } from '../../domain/entities';
import { PushSubscriptionRepository } from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaPushSubscriptionRepository
  implements PushSubscriptionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string): Promise<PushSubscriptionEntity[]> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((subscription) =>
      this.mapSubscription(subscription),
    );
  }

  async upsert(
    userId: string,
    endpoint: string,
    keys: Record<string, string>,
  ): Promise<PushSubscriptionEntity> {
    const subscription = await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId,
        keys: keys as Prisma.InputJsonValue,
      },
      create: {
        userId,
        endpoint,
        keys: keys as Prisma.InputJsonValue,
      },
    });

    return this.mapSubscription(subscription);
  }

  async remove(userId: string, id: string): Promise<number> {
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { id, userId },
    });

    return result.count;
  }

  private mapSubscription(
    subscription: PushSubscription,
  ): PushSubscriptionEntity {
    return {
      id: subscription.id,
      userId: subscription.userId,
      endpoint: subscription.endpoint,
      keys: this.toKeys(subscription.keys),
      createdAt: subscription.createdAt,
    };
  }

  private toKeys(value: Prisma.JsonValue): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }

    return Object.entries(value).reduce<Record<string, string>>(
      (keys, [name, keyValue]) => {
        if (typeof keyValue === 'string') {
          keys[name] = keyValue;
        }

        return keys;
      },
      {},
    );
  }
}
