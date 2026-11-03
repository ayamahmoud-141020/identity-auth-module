import { Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiCookieAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { REFRESH_COOKIE_NAME, RefreshCookieService } from '../common/refresh-cookie.service';
import { SignOutCommand } from './sign-out.command';

@ApiTags('auth')
@Controller('auth')
export class SignOutController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly refreshCookie: RefreshCookieService,
  ) {}

  @Post('sign-out')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth(REFRESH_COOKIE_NAME)
  @ApiOperation({ summary: 'Revoke the current session and clear the refresh cookie' })
  @ApiNoContentResponse({ description: 'Always succeeds, even without a valid session' })
  async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.commandBus.execute(
      new SignOutCommand(this.refreshCookie.read(req.cookies as Record<string, unknown>)),
    );
    this.refreshCookie.clear(res);
  }
}
