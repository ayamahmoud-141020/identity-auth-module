import { DomainError } from './domain.error';

export class UserNotFoundError extends DomainError {
  readonly code = 'USER_NOT_FOUND';

  constructor() {
    super('User not found');
  }
}
