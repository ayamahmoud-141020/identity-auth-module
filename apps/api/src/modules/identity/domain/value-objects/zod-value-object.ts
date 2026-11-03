import { type ZodType } from 'zod';
import { ValidationError } from '../errors/validation.error';

/** Parses with a shared schema and converts failures into a domain ValidationError. */
export function parseWithSchema<T>(field: string, schema: ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ValidationError(
      field,
      result.error.issues.map((issue) => issue.message),
    );
  }
  return result.data;
}
