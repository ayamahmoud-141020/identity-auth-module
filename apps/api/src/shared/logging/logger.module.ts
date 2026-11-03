import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { type Env } from '../config/env.schema';

export const REQUEST_ID_HEADER = 'x-request-id';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const isDev = config.get('NODE_ENV', { infer: true }) === 'development';
        return {
          pinoHttp: {
            level: config.get('LOG_LEVEL', { infer: true }),
            genReqId: (req, res) => {
              const incoming = req.headers[REQUEST_ID_HEADER];
              const id =
                typeof incoming === 'string' && incoming.length <= 128 ? incoming : randomUUID();
              res.setHeader(REQUEST_ID_HEADER, id);
              return id;
            },
            customProps: (req) => ({ requestId: req.id }),
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
                'req.body.password',
                '*.password',
              ],
              censor: '[REDACTED]',
            },
            autoLogging: { ignore: (req) => req.url?.endsWith('/health') ?? false },
            ...(isDev
              ? {
                  transport: {
                    target: 'pino-pretty',
                    options: { singleLine: true, colorize: true },
                  },
                }
              : {}),
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
