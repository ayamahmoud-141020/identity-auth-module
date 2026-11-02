import { nameSchema } from '@app/shared';
import { parseWithSchema } from './zod-value-object';

export class UserName {
  private constructor(readonly value: string) {}

  static create(raw: string): UserName {
    return new UserName(parseWithSchema('name', nameSchema, raw));
  }

  static fromPersistence(value: string): UserName {
    return new UserName(value);
  }
}
