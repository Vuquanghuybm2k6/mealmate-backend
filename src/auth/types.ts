import { UserEntity } from '../domain/entities';

export interface GoogleProfileInput {
  googleId: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: AuthenticatedUser;
}

export type UserWithToken = UserEntity & { accessToken?: string };
