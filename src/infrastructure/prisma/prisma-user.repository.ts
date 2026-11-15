import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { GoogleUserInput, UserEntity } from '../../domain/entities';
import {
  UserProfileUpdate,
  UserRepository,
} from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    return user ? this.mapUser(user) : null;
  }

  /**
   * Một tài khoản Google có thể đăng nhập lần đầu, hoặc trùng email với user
   * đã tồn tại (ví dụ user demo). Ưu tiên khớp googleId trước, sau đó tới email.
   */
  async upsertGoogleUser(input: GoogleUserInput): Promise<UserEntity> {
    const existingByGoogleId = await this.prisma.user.findUnique({
      where: { googleId: input.googleId },
    });
    const existing =
      existingByGoogleId ??
      (await this.prisma.user.findUnique({ where: { email: input.email } }));

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId: input.googleId,
            email: input.email,
            name: input.name,
            avatarUrl: input.avatarUrl,
          },
        })
      : await this.prisma.user.create({
          data: {
            googleId: input.googleId,
            email: input.email,
            name: input.name,
            avatarUrl: input.avatarUrl,
          },
        });

    return this.mapUser(user);
  }

  async updateProfile(
    id: string,
    data: UserProfileUpdate,
  ): Promise<UserEntity | null> {
    const existing = await this.prisma.user.findUnique({ where: { id } });

    if (!existing) {
      return null;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.mapUser(user);
  }

  private mapUser(user: User): UserEntity {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      googleId: user.googleId,
      createdAt: user.createdAt,
    };
  }
}
