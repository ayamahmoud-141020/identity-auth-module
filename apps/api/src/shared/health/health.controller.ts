import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { type Connection, ConnectionStates } from 'mongoose';

@ApiTags('health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  @ApiOkResponse({ schema: { example: { status: 'ok', mongo: 'up' } } })
  @ApiServiceUnavailableResponse({ description: 'Database unreachable' })
  check(): { status: 'ok'; mongo: 'up' } {
    if (this.connection.readyState !== ConnectionStates.connected) {
      throw new ServiceUnavailableException('Database unreachable');
    }
    return { status: 'ok', mongo: 'up' };
  }
}
