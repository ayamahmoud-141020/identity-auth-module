import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import { PinoLogger } from 'nestjs-pino';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';

/**
 * The only consumer of UserRegistered. It exists to show the extension point (welcome email,
 * analytics, ...) without adding infrastructure. Deliberately logs the id, not the email.
 */
@EventsHandler(UserRegisteredEvent)
export class LogUserRegisteredHandler implements IEventHandler<UserRegisteredEvent> {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LogUserRegisteredHandler.name);
  }

  handle(event: UserRegisteredEvent): void {
    this.logger.info({ userId: event.userId, occurredAt: event.occurredAt }, 'User registered');
  }
}
