import 'reflect-metadata';
import { type INestApplication } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const TEST_ENV = {
  NODE_ENV: 'test',
  JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-0001',
  JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret-01',
  ACCESS_TOKEN_TTL_SECONDS: '900',
  REFRESH_TOKEN_TTL_SECONDS: '604800',
  WEB_ORIGIN: 'http://localhost:5173',
  LOG_LEVEL: 'silent',
  TRUST_PROXY: 'true',
  THROTTLE_TTL_SECONDS: '60',
  THROTTLE_LIMIT: '1000',
} as const;

export interface TestContext {
  app: INestApplication;
  mongo: MongoMemoryServer;
  close(): Promise<void>;
}

/** Boots the real AppModule against an in-memory MongoDB with the same setup as main.ts. */
export async function createTestApp(
  envOverrides: Partial<Record<string, string>> = {},
): Promise<TestContext> {
  const mongo = await MongoMemoryServer.create();
  Object.assign(process.env, TEST_ENV, { MONGODB_URI: mongo.getUri('identity-e2e') }, envOverrides);

  // Imported after the env is set: ConfigModule validates the environment at import time.
  const [{ AppModule }, { configureApp }] = await Promise.all([
    import('../src/app.module'),
    import('../src/app.setup'),
  ]);
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
  configureApp(app);
  await app.init();

  return {
    app,
    mongo,
    close: async () => {
      await app.close();
      await mongo.stop();
    },
  };
}
