import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Request, type Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { type ApiErrorResponse } from '@app/shared';
import {
  DomainError,
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  UserNotFoundError,
  ValidationError,
} from '../../modules/identity/domain/errors';
import { type Env } from '../config/env.schema';
import { RequestValidationError } from './request-validation.error';

const REASON: Partial<Record<number, string>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

interface Mapped {
  status: number;
  message: string;
  details?: Record<string, string[]>;
}

/**
 * The single place where errors become HTTP responses.
 * Domain errors are plain classes; handlers never throw HttpException.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly exposeInternals: boolean;

  constructor(
    private readonly logger: PinoLogger,
    config: ConfigService<Env, true>,
  ) {
    this.exposeInternals = config.get('NODE_ENV', { infer: true }) === 'development';
    this.logger.setContext(HttpExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();
    const mapped = this.map(exception);

    if (mapped.status >= 500) {
      this.logger.error({ err: exception, requestId: req.id }, 'Unhandled exception');
    }

    const body: ApiErrorResponse = {
      statusCode: mapped.status,
      error: REASON[mapped.status] ?? 'Error',
      message: mapped.message,
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: req.id ?? 'unknown',
      ...(mapped.details ? { details: mapped.details } : {}),
    };
    res.status(mapped.status).json(body);
  }

  private map(exception: unknown): Mapped {
    if (exception instanceof RequestValidationError) {
      return { status: 400, message: exception.message, details: exception.details };
    }
    if (exception instanceof DomainError) {
      return this.mapDomainError(exception);
    }
    if (exception instanceof HttpException) {
      return { status: exception.getStatus(), message: this.httpMessage(exception) };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        this.exposeInternals && exception instanceof Error
          ? exception.message
          : 'Internal server error',
    };
  }

  private mapDomainError(error: DomainError): Mapped {
    if (error instanceof ValidationError) {
      return {
        status: 400,
        message: 'Request validation failed',
        details: { [error.field]: [...error.messages] },
      };
    }
    if (error instanceof EmailAlreadyInUseError) return { status: 409, message: error.message };
    if (error instanceof InvalidCredentialsError) return { status: 401, message: error.message };
    if (error instanceof InvalidRefreshTokenError) return { status: 401, message: error.message };
    if (error instanceof UserNotFoundError) return { status: 404, message: error.message };
    return { status: 500, message: 'Internal server error' };
  }

  private httpMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const m: unknown = response.message;
      return Array.isArray(m) ? m.map(String).join('; ') : String(m);
    }
    return exception.message;
  }
}
