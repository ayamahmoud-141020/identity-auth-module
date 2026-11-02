import { randomUUID } from 'node:crypto';
import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
  TOKEN_ISSUER,
  type TokenIssuer,
  USER_REPOSITORY,
  type UserRepository,
} from '../../domain/ports';
import { User } from '../../domain/user.aggregate';
import { Email, PlainPassword, UserName } from '../../domain/value-objects';
import { type AuthSessionResult } from '../common/auth-session.result';
import { startNewSession } from '../common/issue-session';
import { SignUpCommand } from './sign-up.command';

@CommandHandler(SignUpCommand)
export class SignUpHandler implements ICommandHandler<SignUpCommand> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: SignUpCommand): Promise<AuthSessionResult> {
    const email = Email.create(command.email);
    const name = UserName.create(command.name);
    const password = PlainPassword.create(command.password);

    const user = User.register({
      id: randomUUID(),
      email,
      name,
      passwordHash: await this.hasher.hash(password),
    });
    const session = await startNewSession(user, this.tokens);

    await this.users.save(user); // throws EmailAlreadyInUseError via the unique index
    await this.eventBus.publishAll(user.pullEvents());
    return session;
  }
}
