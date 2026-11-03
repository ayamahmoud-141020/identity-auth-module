import { passwordSchema } from '@app/shared';
import { parseWithSchema } from './zod-value-object';

/**
 * A password that satisfies the policy. Exists only in memory on the way to the hasher.
 * Never persisted, never logged: toString/JSON are deliberately opaque.
 */
export class PlainPassword {
  private constructor(private readonly secret: string) {}

  static create(raw: string): PlainPassword {
    return new PlainPassword(parseWithSchema('password', passwordSchema, raw));
  }

  /** Only the PasswordHasher should call this. */
  reveal(): string {
    return this.secret;
  }

  toString(): string {
    return '[PlainPassword]';
  }

  toJSON(): string {
    return '[PlainPassword]';
  }
}
