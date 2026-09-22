export default {
    preset: "ts-jest",
    testEnvironment: "node",
    extensionsToTreatAsEsm: [".ts"],
    moduleNameMapper: {
        "^(\\.{1,2}/.*)\\.js$": "$1"
    },
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                useESM: true
            }
        ]
    },
    verbose: true,
    coverageDirectory: "./test/coverage",
    collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
    // Coverage is collected on every run and rewrites test/coverage/ (gitignored)
    collectCoverage: true,
    coverageReporters: ["text", "lcov", "html"],
    setupFilesAfterEnv: [],
    testMatch: ["<rootDir>/test/**/*.spec.js"]
};
