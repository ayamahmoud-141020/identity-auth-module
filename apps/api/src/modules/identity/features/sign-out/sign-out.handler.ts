import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  TOKEN_ISSUER,
  type TokenIssuer,
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports';
import { SignOutCommand } from './sign-out.command';

/** Idempotent: an absent or invalid token is already "signed out", so it never fails. */
@CommandHandler(SignOutCommand)
export class SignOutHandler implements ICommandHandler<SignOutCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
  ) {}

  async execute(command: SignOutCommand): Promise<void> {
    if (!command.refreshToken) return;
    const claims = await this.tokens.verifyRefreshToken(command.refreshToken);
    if (!claims) return;

    const user = await this.users.findById(claims.userId);
    if (!user || user.currentSession?.id !== claims.sessionId) return;

    user.revokeSessions();
    await this.users.save(user);
  }
}
