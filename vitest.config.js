import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["test/**/*.spec.js"],
        // Coverage is opt-in: vitest collects it only when --coverage is passed, so a single-spec run
        // no longer rewrites test/coverage/ the way jest's collectCoverage: true used to.
        // The key is `reporter` (singular) — `reporters` is the top-level vitest option, and an
        // unknown key here is ignored silently, which is how the first version of this config ended up
        // generating the *default* reporters (clover.xml, coverage-final.json) and no lcov at all.
        coverage: {
            provider: "v8",
            reportsDirectory: "./test/coverage",
            include: ["src/**/*.ts"],
            exclude: ["src/**/*.d.ts"],
            reporter: ["text", "json", "lcov", "html"]
        }
    }
});
