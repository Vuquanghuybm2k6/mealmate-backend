import { Injectable } from '@nestjs/common';
import { FunMessage, FunMessageContext } from '@prisma/client';
import { FunMessageEntity } from '../../domain/entities';
import { FunMessageContextValue } from '../../domain/enums';
import { FunMessageRepository } from '../../domain/repositories';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaFunMessageRepository implements FunMessageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<FunMessageEntity[]> {
    const messages = await this.prisma.funMessage.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((message) => this.mapMessage(message));
  }

  async findByContext(
    context: FunMessageContextValue,
  ): Promise<FunMessageEntity[]> {
    const messages = await this.prisma.funMessage.findMany({
      where: { context: context as FunMessageContext },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((message) => this.mapMessage(message));
  }

  private mapMessage(message: FunMessage): FunMessageEntity {
    return {
      id: message.id,
      context: message.context as FunMessageContextValue,
      text: message.text,
      author: message.author,
    };
  }
}
