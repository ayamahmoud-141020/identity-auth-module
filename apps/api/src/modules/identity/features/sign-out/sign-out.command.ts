import { Command } from '@nestjs/cqrs';

export class SignOutCommand extends Command<void> {
  constructor(readonly refreshToken: string | undefined) {
    super();
  }
}
