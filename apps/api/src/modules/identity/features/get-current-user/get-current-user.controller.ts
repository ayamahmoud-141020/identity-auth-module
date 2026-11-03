import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { type UserResponse } from '@app/shared';
import { ApiErrorDto } from '../../../../shared/http/api-error.dto';
import {
  type AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from '../../infrastructure/security/jwt-auth.guard';
import { UserResponseDto } from '../common/auth-response.dto';
import { GetCurrentUserQuery } from './get-current-user.query';

@ApiTags('users')
@Controller('users')
export class GetCurrentUserController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user profile (protected)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorDto, description: 'Missing, invalid or expired token' })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponse> {
    return this.queryBus.execute(new GetCurrentUserQuery(user.userId));
  }
}
