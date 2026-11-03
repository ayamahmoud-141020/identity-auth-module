import { Command } from '@nestjs/cqrs';
import { type AuthSessionResult } from '../common/auth-session.result';

export class SignUpCommand extends Command<AuthSessionResult> {
  constructor(
    readonly email: string,
    readonly name: string,
    readonly password: string,
  ) {
    super();
  }
}
