import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { InvalidCredentialsError } from '../../domain/errors';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
  TOKEN_ISSUER,
  type TokenIssuer,
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports';
import { Email } from '../../domain/value-objects';
import { type AuthSessionResult } from '../common/auth-session.result';
import { startNewSession } from '../common/issue-session';
import { SignInCommand } from './sign-in.command';

@CommandHandler(SignInCommand)
export class SignInHandler implements ICommandHandler<SignInCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
  ) {}

  async execute(command: SignInCommand): Promise<AuthSessionResult> {
    const user = await this.users.findByEmail(Email.create(command.email));

    // Always run the hash verification (against a dummy hash when the user is unknown) and
    // always fail with the same error: no user enumeration by message or by timing.
    const passwordMatches = await this.hasher.verify(user?.passwordHash ?? null, command.password);
    if (!user || !passwordMatches) throw new InvalidCredentialsError();

    const session = await startNewSession(user, this.tokens);
    await this.users.save(user);
    return session;
  }
}
