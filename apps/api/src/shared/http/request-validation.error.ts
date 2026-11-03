import { type ZodError } from 'zod';

/** Raised by the request validation pipe; mapped to 400 by the exception filter. */
export class RequestValidationError extends Error {
  readonly details: Record<string, string[]>;

  constructor(error: ZodError) {
    super('Request validation failed');
    this.name = 'RequestValidationError';
    this.details = {};
    for (const issue of error.issues) {
      const key = issue.path.length > 0 ? issue.path.map(String).join('.') : '_';
      (this.details[key] ??= []).push(issue.message);
    }
  }
}
