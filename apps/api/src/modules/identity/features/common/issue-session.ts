import { randomUUID } from 'node:crypto';
import { type UserResponse } from '@app/shared';
import { type TokenIssuer } from '../../domain/ports';
import { type User } from '../../domain/user.aggregate';
import { type AuthSessionResult } from './auth-session.result';

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email.value,
    name: user.name.value,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Starts a brand-new session on the aggregate (replacing any existing one) and issues both tokens.
 * The caller is responsible for persisting the aggregate afterwards.
 */
export async function startNewSession(user: User, tokens: TokenIssuer): Promise<AuthSessionResult> {
  const sessionId = randomUUID();
  const refreshToken = await tokens.issueRefreshToken({ userId: user.id, sessionId });
  user.startSession({
    id: sessionId,
    refreshTokenHash: refreshToken.hash,
    expiresAt: refreshToken.expiresAt,
  });
  const accessToken = await tokens.issueAccessToken({ userId: user.id, email: user.email.value });
  return { accessToken, refreshToken, user: toUserResponse(user) };
}
