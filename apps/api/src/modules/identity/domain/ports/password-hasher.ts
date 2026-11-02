import { type PasswordHash, type PlainPassword } from '../value-objects';

export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasher {
  hash(password: PlainPassword): Promise<PasswordHash>;
  /**
   * Verifies a candidate against a hash. When `hash` is null (unknown user) the implementation
   * must still perform a full verification against a dummy hash and return false, so that
   * unknown-email and wrong-password take comparable time.
   */
  verify(hash: PasswordHash | null, candidate: string): Promise<boolean>;
}
