import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { REFRESH_COOKIE_NAME } from './modules/identity/features/common/refresh-cookie.service';
import { type Env } from './shared/config/env.schema';

export const API_PREFIX = 'api/v1';
export const DOCS_PATH = 'api/docs';

/** Everything main.ts and the e2e harness must configure identically. */
export function configureApp(app: NestExpressApplication): INestApplication {
  const config = app.get(ConfigService<Env, true>);

  app.useLogger(app.get(Logger));
  app.set('trust proxy', config.get('TRUST_PROXY', { infer: true }) ? 1 : false);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Identity API')
        .setDescription('Sign-up, sign-in, session refresh and a protected profile endpoint.')
        .setVersion('1.0')
        .addBearerAuth()
        .addCookieAuth(REFRESH_COOKIE_NAME)
        .build(),
    );
    SwaggerModule.setup(DOCS_PATH, app, document);
  }
  return app;
}
