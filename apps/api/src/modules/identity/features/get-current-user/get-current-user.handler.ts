import { InjectModel } from '@nestjs/mongoose';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { type Model } from 'mongoose';
import { type UserResponse } from '@app/shared';
import { UserNotFoundError } from '../../domain/errors';
import { UserDocument } from '../../infrastructure/persistence/user.schema';
import { GetCurrentUserQuery } from './get-current-user.query';

/** Read side: a lean projection straight from the collection; the aggregate is not loaded. */
@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler implements IQueryHandler<GetCurrentUserQuery> {
  constructor(@InjectModel(UserDocument.name) private readonly model: Model<UserDocument>) {}

  async execute(query: GetCurrentUserQuery): Promise<UserResponse> {
    const doc = await this.model
      .findById(query.userId)
      .select({ email: 1, name: 1, createdAt: 1 })
      .lean<Pick<UserDocument, '_id' | 'email' | 'name' | 'createdAt'>>()
      .exec();
    if (!doc) throw new UserNotFoundError();
    return {
      id: doc._id,
      email: doc.email,
      name: doc.name,
      createdAt: doc.createdAt.toISOString(),
    };
  }
}
