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
            reporter: ["text", "json", "lcov", "html"],
            // Measured: 457/457 statements, 344/344 branches, 76/76 functions, 413/413 lines — every
            // metric at 100%, because removing the dead code recorded in DEFERRED_WORK.md took the last
            // uncovered range with it (the counts were identical on Node 22 and 24 when the thresholds
            // were set). The thresholds stay a notch below the measurement on purpose: they are a
            // floor, so a legitimate change that adds an uncovered error path is a review point
            // rather than a red CI run. `src/index.ts` reports 0% across the board without dragging
            // these numbers down: a file of pure re-exports has no statement for v8 to instrument.
            thresholds: {
                statements: 99,
                branches: 98,
                functions: 99,
                lines: 99
            }
        }
    }
});
