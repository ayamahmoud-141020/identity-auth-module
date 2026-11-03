import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp, DOCS_PATH } from './app.setup';
import { type Env } from './shared/config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  configureApp(app);

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`API listening on http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    logger.log(`Swagger UI at http://localhost:${port}/${DOCS_PATH}`, 'Bootstrap');
  }
}

bootstrap().catch((error: unknown) => {
  // Config validation and connection errors land here: fail fast, loudly.
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
