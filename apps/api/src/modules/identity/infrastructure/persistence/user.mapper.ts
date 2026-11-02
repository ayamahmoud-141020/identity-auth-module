import { User } from '../../domain/user.aggregate';
import { Email, PasswordHash, UserName } from '../../domain/value-objects';
import { type UserDocument } from './user.schema';

/** Maps between the aggregate and the raw Mongo document shape. */
export const UserMapper = {
  toDomain(doc: UserDocument): User {
    return User.rehydrate({
      id: doc._id,
      email: Email.fromPersistence(doc.email),
      name: UserName.fromPersistence(doc.name),
      passwordHash: PasswordHash.fromString(doc.passwordHash),
      session: doc.session
        ? {
            id: doc.session.id,
            refreshTokenHash: doc.session.refreshTokenHash,
            expiresAt: doc.session.expiresAt,
          }
        : null,
      createdAt: doc.createdAt,
    });
  },

  toPersistence(user: User): UserDocument {
    const s = user.toSnapshot();
    return {
      _id: s.id,
      email: s.email.value,
      name: s.name.value,
      passwordHash: s.passwordHash.value,
      session: s.session ? { ...s.session } : null,
      createdAt: s.createdAt,
    };
  },
};
