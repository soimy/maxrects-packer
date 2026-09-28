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
            // Measured: 447/448 statements, 372/378 branches, 74/74 functions, 402/402 lines. The
            // counts were identical on Node 22 and 24 when the thresholds were set and only moved
            // because a fix added covered code. The uncovered remainder is the dead code recorded in
            // DEFERRED_WORK.md, so these are a floor rather than a target — the little slack keeps a
            // legitimate change from failing over a fraction, and raising them belongs to the change
            // that earns it. `src/index.ts` reports 0% across the board without dragging these
            // numbers down: a file of pure re-exports has no statement for v8 to instrument.
            thresholds: {
                statements: 99,
                branches: 98,
                functions: 99,
                lines: 99
            }
        }
    }
});
