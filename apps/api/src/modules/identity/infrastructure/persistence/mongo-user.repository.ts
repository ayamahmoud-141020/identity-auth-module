import { Injectable, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type Model } from 'mongoose';
import { EmailAlreadyInUseError } from '../../domain/errors';
import { type UserRepository } from '../../domain/ports';
import { type User } from '../../domain/user.aggregate';
import { type Email } from '../../domain/value-objects';
import { UserMapper } from './user.mapper';
import { UserDocument } from './user.schema';

const MONGO_DUPLICATE_KEY = 11000;
const SECRET_FIELDS = '+passwordHash +session.refreshTokenHash';

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === MONGO_DUPLICATE_KEY
  );
}

@Injectable()
export class MongoUserRepository implements UserRepository, OnModuleInit {
  constructor(@InjectModel(UserDocument.name) private readonly model: Model<UserDocument>) {}

  /** The unique email index is a correctness requirement, so it is built before serving traffic. */
  async onModuleInit(): Promise<void> {
    await this.model.ensureIndexes();
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.model.findById(id).select(SECRET_FIELDS).lean<UserDocument>().exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const doc = await this.model
      .findOne({ email: email.value })
      .select(SECRET_FIELDS)
      .lean<UserDocument>()
      .exec();
    return doc ? UserMapper.toDomain(doc) : null;
  }

  async save(user: User): Promise<void> {
    const { _id, ...fields } = UserMapper.toPersistence(user);
    try {
      await this.model.updateOne({ _id }, { $set: fields }, { upsert: true }).exec();
    } catch (error) {
      // Duplicate email is detected by the unique index, not by a pre-check: a pre-check alone
      // would let two concurrent sign-ups both pass.
      if (isDuplicateKeyError(error)) throw new EmailAlreadyInUseError();
      throw error;
    }
  }
}
