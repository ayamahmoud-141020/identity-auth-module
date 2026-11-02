import { EmailAlreadyInUseError } from '../../src/modules/identity/domain/errors';
import { type UserRepository } from '../../src/modules/identity/domain/ports';
import { User } from '../../src/modules/identity/domain/user.aggregate';
import { type Email } from '../../src/modules/identity/domain/value-objects';

/** Behaves like the Mongo adapter: upsert by id, unique email, returns fresh copies. */
export class InMemoryUserRepository implements UserRepository {
  private readonly rows = new Map<string, User>();

  findById(id: string): Promise<User | null> {
    const user = this.rows.get(id);
    return Promise.resolve(user ? User.rehydrate(user.toSnapshot()) : null);
  }

  findByEmail(email: Email): Promise<User | null> {
    for (const user of this.rows.values()) {
      if (user.email.equals(email)) return Promise.resolve(User.rehydrate(user.toSnapshot()));
    }
    return Promise.resolve(null);
  }

  save(user: User): Promise<void> {
    for (const existing of this.rows.values()) {
      if (existing.id !== user.id && existing.email.equals(user.email)) {
        return Promise.reject(new EmailAlreadyInUseError());
      }
    }
    this.rows.set(user.id, User.rehydrate(user.toSnapshot()));
    return Promise.resolve();
  }

  get size(): number {
    return this.rows.size;
  }
}
