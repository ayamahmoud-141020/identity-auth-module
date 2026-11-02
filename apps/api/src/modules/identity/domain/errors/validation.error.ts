import { DomainError } from './domain.error';

/** Thrown by value objects when an invariant is violated. */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_FAILED';

  constructor(
    readonly field: string,
    readonly messages: readonly string[],
  ) {
    super(messages.join('; '));
  }
}
