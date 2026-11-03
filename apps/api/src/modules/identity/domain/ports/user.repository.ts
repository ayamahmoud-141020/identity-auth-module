import { type User } from '../user.aggregate';
import { type Email } from '../value-objects';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  /**
   * Inserts or updates the aggregate. Must throw EmailAlreadyInUseError when the email is taken,
   * relying on the unique index (not a pre-check) so concurrent sign-ups cannot both succeed.
   */
  save(user: User): Promise<void>;
}
