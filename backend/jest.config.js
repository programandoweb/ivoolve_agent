module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/orchestrator/src'],
  testMatch: ['**/*.spec.ts'],
  collectCoverageFrom: [
    'apps/orchestrator/src/**/*.ts',
    '!apps/orchestrator/src/main.ts',
    '!apps/orchestrator/src/**/*.module.ts',
  ],
};
