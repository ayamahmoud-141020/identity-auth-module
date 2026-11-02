import { ValidationError } from '../errors/validation.error';

export class PasswordHash {
  private constructor(readonly value: string) {}

  static fromString(value: string): PasswordHash {
    if (typeof value !== 'string' || value.length === 0) {
      throw new ValidationError('passwordHash', ['Password hash must be a non-empty string']);
    }
    return new PasswordHash(value);
  }

  toString(): string {
    return '[PasswordHash]';
  }

  toJSON(): string {
    return '[PasswordHash]';
  }
}
