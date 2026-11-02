import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { type Response } from 'express';
import { type AuthResponse, type SignUpInput, signUpSchema } from '@app/shared';
import { ApiErrorDto } from '../../../../shared/http/api-error.dto';
import { AUTH_RATE_LIMIT } from '../../../../shared/http/rate-limits';
import { ZodValidationPipe } from '../../../../shared/http/zod-validation.pipe';
import { AuthResponseDto } from '../common/auth-response.dto';
import { RefreshCookieService } from '../common/refresh-cookie.service';
import { SignUpCommand } from './sign-up.command';
import { SignUpRequest } from './sign-up.request';

@ApiTags('auth')
@Controller('auth')
export class SignUpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: AUTH_RATE_LIMIT })
  @ApiOperation({ summary: 'Create an account and start a session' })
  @ApiBody({ type: SignUpRequest })
  @ApiCreatedResponse({
    type: AuthResponseDto,
    description: 'Also sets the httpOnly refresh cookie',
  })
  @ApiBadRequestResponse({ type: ApiErrorDto })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'Email already registered' })
  @ApiTooManyRequestsResponse({ type: ApiErrorDto })
  async signUp(
    @Body(new ZodValidationPipe(signUpSchema)) body: SignUpInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.commandBus.execute(
      new SignUpCommand(body.email, body.name, body.password),
    );
    this.refreshCookie.set(res, result.refreshToken);
    return { accessToken: result.accessToken, user: result.user };
  }
}
