import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["test/**/*.spec.js"],
        // Coverage is opt-in: vitest collects it only when --coverage is passed, so a single-spec run
        // no longer rewrites test/coverage/ the way jest's collectCoverage: true used to.
        coverage: {
            provider: "v8",
            reportsDirectory: "./test/coverage",
            include: ["src/**/*.ts"],
            exclude: ["src/**/*.d.ts"],
            reporters: ["text", "lcov", "html"]
        }
    }
});
