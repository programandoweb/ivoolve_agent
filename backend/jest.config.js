module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/orchestrator/src'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@whiskeysockets/baileys$': '<rootDir>/test/baileys.mock.js',
  },
  collectCoverageFrom: [
    'apps/orchestrator/src/**/*.ts',
    '!apps/orchestrator/src/main.ts',
    '!apps/orchestrator/src/**/*.module.ts',
  ],
};
