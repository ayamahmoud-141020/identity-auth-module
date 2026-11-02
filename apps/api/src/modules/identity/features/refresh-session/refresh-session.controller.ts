import { Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type Request, type Response } from 'express';
import { type AuthResponse } from '@app/shared';
import { ApiErrorDto } from '../../../../shared/http/api-error.dto';
import { AUTH_RATE_LIMIT } from '../../../../shared/http/rate-limits';
import { AuthResponseDto } from '../common/auth-response.dto';
import { REFRESH_COOKIE_NAME, RefreshCookieService } from '../common/refresh-cookie.service';
import { RefreshSessionCommand } from './refresh-session.command';

@ApiTags('auth')
@Controller('auth')
export class RefreshSessionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ...AUTH_RATE_LIMIT, limit: AUTH_RATE_LIMIT.limit * 3 } })
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({
    summary: 'Rotate the refresh token and issue a new access token',
    description:
      'Reads the httpOnly refresh cookie. Presenting an already-rotated token revokes the session.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    try {
      const result = await this.commandBus.execute(
        new RefreshSessionCommand(this.refreshCookie.read(req.cookies as Record<string, unknown>)),
      );
      this.refreshCookie.set(res, result.refreshToken);
      return { accessToken: result.accessToken, user: result.user };
    } catch (error) {
      this.refreshCookie.clear(res);
      throw error;
    }
  }
}
