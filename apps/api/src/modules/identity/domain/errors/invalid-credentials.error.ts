import { DomainError } from './domain.error';

/** Same error for unknown email and wrong password: no user enumeration. */
export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Invalid email or password');
  }
}
