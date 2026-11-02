import type { Config } from 'jest';

const common: Config = {
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'node',
};

const config: Config = {
  projects: [
    { ...common, displayName: 'unit', rootDir: '.', testMatch: ['<rootDir>/src/**/*.spec.ts'] },
    {
      ...common,
      displayName: 'e2e',
      rootDir: '.',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
    },
  ],
  // Booting Nest + in-memory Mongo in the e2e beforeAll can exceed Jest's 5 s default.
  testTimeout: 60_000,
};

export default config;
