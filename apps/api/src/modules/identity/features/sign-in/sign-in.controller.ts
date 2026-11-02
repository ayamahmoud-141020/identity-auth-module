import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type Response } from 'express';
import { type AuthResponse, type SignInInput, signInSchema } from '@app/shared';
import { ApiErrorDto } from '../../../../shared/http/api-error.dto';
import { AUTH_RATE_LIMIT } from '../../../../shared/http/rate-limits';
import { ZodValidationPipe } from '../../../../shared/http/zod-validation.pipe';
import { AuthResponseDto } from '../common/auth-response.dto';
import { RefreshCookieService } from '../common/refresh-cookie.service';
import { SignInCommand } from './sign-in.command';
import { SignInRequest } from './sign-in.request';

@ApiTags('auth')
@Controller('auth')
export class SignInController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: AUTH_RATE_LIMIT })
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiBody({ type: SignInRequest })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Also sets the httpOnly refresh cookie' })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  async signIn(
    @Body(new ZodValidationPipe(signInSchema)) body: SignInInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.commandBus.execute(new SignInCommand(body.email, body.password));
    this.refreshCookie.set(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }
}
