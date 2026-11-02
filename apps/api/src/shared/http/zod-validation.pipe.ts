import { Injectable, type PipeTransform } from '@nestjs/common';
import { type ZodType } from 'zod';
import { RequestValidationError } from './request-validation.error';

/** Validates and normalizes a request body against a shared Zod schema. */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new RequestValidationError(result.error);
    }
    return result.data;
  }
}
