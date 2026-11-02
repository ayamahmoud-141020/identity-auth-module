import { Command } from '@nestjs/cqrs';
import { type AuthSessionResult } from '../common/auth-session.result';

export class RefreshSessionCommand extends Command<AuthSessionResult> {
  constructor(readonly refreshToken: string | undefined) {
    super();
  }
}
