import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InvalidRefreshTokenError } from '../../domain/errors';
import {
  TOKEN_ISSUER,
  type TokenIssuer,
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports';
import { type AuthSessionResult } from '../common/auth-session.result';
import { toUserResponse } from '../common/issue-session';
import { RefreshSessionCommand } from './refresh-session.command';

@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<RefreshSessionCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<AuthSessionResult> {
    const claims = command.refreshToken
      ? await this.tokens.verifyRefreshToken(command.refreshToken)
      : null;
    if (!claims || !command.refreshToken) throw new InvalidRefreshTokenError();

    const user = await this.users.findById(claims.userId);
    if (!user) throw new InvalidRefreshTokenError();

    const next = await this.tokens.issueRefreshToken({
      userId: user.id,
      sessionId: claims.sessionId,
    });
    try {
      user.rotateRefreshToken({
        sessionId: claims.sessionId,
        presentedTokenHash: this.tokens.hashRefreshToken(command.refreshToken),
        next: { refreshTokenHash: next.hash, expiresAt: next.expiresAt },
      });
    } catch (error) {
      // Reuse detection / expiry revoked the session inside the aggregate: persist that.
      if (error instanceof InvalidRefreshTokenError) await this.users.save(user);
      throw error;
    }
    await this.users.save(user);

    const accessToken = await this.tokens.issueAccessToken({
      userId: user.id,
      email: user.email.value,
    });
    return { accessToken, refreshToken: next, user: toUserResponse(user) };
  }
}
