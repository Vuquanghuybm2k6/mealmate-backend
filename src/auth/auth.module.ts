import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { USER_REPOSITORY } from '../domain/repositories';
import { PrismaUserRepository } from '../infrastructure/prisma/prisma-user.repository';
import {
  GoogleAuthGuard,
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from './auth.guards';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './google.strategy';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        secret: config.jwtSecret,
        signOptions: {
          expiresIn: config.jwtExpiresIn as unknown as number,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    GoogleAuthGuard,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      // JWT tuỳ chọn cho toàn bộ API: có token thì dùng req.user.id,
      // không có thì vẫn fallback header x-user-id như giai đoạn dev.
      provide: APP_GUARD,
      useClass: OptionalJwtAuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
