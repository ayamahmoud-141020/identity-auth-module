import { DomainError } from './domain.error';

export class EmailAlreadyInUseError extends DomainError {
  readonly code = 'EMAIL_ALREADY_IN_USE';

  constructor() {
    super('An account with this email already exists');
  }
}
