export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true
    }]
  },
  verbose: true,
  coverageDirectory: './test/coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  // 确保源码映射支持
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html'],
  // 添加源码映射支持
  setupFilesAfterEnv: [],
  testMatch: ['<rootDir>/test/**/*.spec.js']
};
