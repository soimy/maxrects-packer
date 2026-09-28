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

// An artifact has to be *usable*, not merely present: an empty file, a truncated one and a record
// that was opened but never closed all pass an existence check while carrying nothing downstream.
const validateLcov = (content) => {
    const sources = content.match(/^SF:(.+)$/gm) ?? [];
    if (sources.length === 0) return "has no SF: source record";
    const closed = content.match(/^end_of_record$/gm) ?? [];
    if (closed.length < sources.length)
        return `has ${sources.length} SF: record(s) but only ${closed.length} closed one(s)`;
    return undefined;
};

const validateCoverageJson = (content) => {
    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch {
        return "is not valid JSON";
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return "is not a JSON object";
    const entries = Object.entries(parsed);
    if (entries.length === 0) return "has no file entries";
    const broken = entries.find(([, value]) => !value || typeof value.path !== "string" || typeof value.s !== "object");
    if (broken) return `has an entry without a path or statement counts: ${broken[0]}`;
    return undefined;
};

for (const file of REQUIRED) {
    let content;
    try {
        content = readFileSync(fileURLToPath(new URL(file, root)), "utf8");
    } catch {
        failures.push(`${file} was not written`);
        continue;
    }
    const problem = file.endsWith(".info") ? validateLcov(content) : validateCoverageJson(content);
    if (problem) failures.push(`${file} ${problem}`);
    else console.log(`  ✓ ${file} → ${content.length} bytes`);
}

if (failures.length > 0) {
    console.error("Coverage artifact self-check failed:");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    console.error("Check test.coverage.reporter in vitest.config.js — an unknown key there is ignored silently.");
    process.exit(1);
}
console.log("Coverage artifact self-check passed");
