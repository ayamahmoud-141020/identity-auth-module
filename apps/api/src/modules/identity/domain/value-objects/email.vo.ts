import { emailSchema } from '@app/shared';
import { parseWithSchema } from './zod-value-object';

export class Email {
  private constructor(readonly value: string) {}

  /** Normalizes (trim + lower-case) and validates against the shared rule. */
  static create(raw: string): Email {
    return new Email(parseWithSchema('email', emailSchema, raw));
  }

  /** For rehydration from persistence: value was validated when it was written. */
  static fromPersistence(value: string): Email {
    return new Email(value);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
