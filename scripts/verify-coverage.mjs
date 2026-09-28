// Post-coverage self-check: the reporters configured in vitest.config.js must actually write the two
// artifacts the rest of the pipeline reads — Codecov uploads lcov.info, and triaging the uncovered
// lines reads coverage-final.json.
// Background: the config key is `coverage.reporter` (singular). An unknown key there is ignored
// silently, which is how the first version of the config kept writing the *default* reporters and no
// lcov at all while every run stayed green.
// oxlint-disable no-console -- this file is a post-coverage CLI; printing the result is its output
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const REQUIRED = ["test/coverage/lcov.info", "test/coverage/coverage-final.json"];
const failures = [];

for (const file of REQUIRED) {
    let content;
    try {
        content = readFileSync(fileURLToPath(new URL(file, root)), "utf8");
    } catch {
        failures.push(`${file} was not written`);
        continue;
    }
    // An empty artifact would satisfy an existence check and still be useless downstream: lcov.info
    // without a single `SF:` record carries nothing for Codecov, and `{}` carries nothing for triage.
    const ok = file.endsWith(".info") ? content.includes("SF:") : content.trim().length > 2;
    if (ok) console.log(`  ✓ ${file} → ${content.length} bytes`);
    else failures.push(`${file} is empty or has no records`);
}

if (failures.length > 0) {
    console.error("Coverage artifact self-check failed:");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    console.error("Check test.coverage.reporter in vitest.config.js — an unknown key there is ignored silently.");
    process.exit(1);
}
console.log("Coverage artifact self-check passed");
