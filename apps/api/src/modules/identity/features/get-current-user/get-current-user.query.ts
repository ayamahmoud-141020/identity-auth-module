import { Query } from '@nestjs/cqrs';
import { type UserResponse } from '@app/shared';

export class GetCurrentUserQuery extends Query<UserResponse> {
  constructor(readonly userId: string) {
    super();
  }
}
