import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type CookieOptions, type Response } from 'express';
import { type Env, isCookieSecure } from '../../../../shared/config/env.schema';
import { type IssuedRefreshToken } from '../../domain/ports';

export const REFRESH_COOKIE_NAME = 'refresh_token';
/** Covers /auth/refresh and /auth/sign-out only; the cookie is never sent to any other route. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

@Injectable()
export class RefreshCookieService {
  private readonly baseOptions: CookieOptions;

  constructor(config: ConfigService<Env, true>) {
    this.baseOptions = {
      httpOnly: true,
      sameSite: 'strict',
      secure: isCookieSecure({
        NODE_ENV: config.get('NODE_ENV', { infer: true }),
        COOKIE_SECURE: config.get('COOKIE_SECURE', { infer: true }),
      }),
      path: REFRESH_COOKIE_PATH,
    };
  }

  set(res: Response, refreshToken: IssuedRefreshToken): void {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken.token, {
      ...this.baseOptions,
      expires: refreshToken.expiresAt,
    });
  }

  clear(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, this.baseOptions);
  }

  read(cookies: Record<string, unknown> | undefined): string | undefined {
    const value = cookies?.[REFRESH_COOKIE_NAME];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
