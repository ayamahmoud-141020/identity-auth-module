import { Command } from '@nestjs/cqrs';
import { type AuthSessionResult } from '../common/auth-session.result';

export class SignInCommand extends Command<AuthSessionResult> {
  constructor(
    readonly email: string,
    readonly password: string,
  ) {
    super();
  }
}
