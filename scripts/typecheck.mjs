// typecheck wrapper: assert that the tsc on PATH really is @typescript/native (native TS 7) before
// running the type check.
//
// Background: package.json installs two TypeScript packages through npm aliases —
//   typescript          -> @typescript/typescript6 (JS compiler API for typedoc / ts-jest / rollup)
//   @typescript/native  -> typescript@7 (native tsc)
// Both declare a bin named tsc, and npm currently links node_modules/.bin/tsc to the native one, but
// how npm resolves bin conflicts is not a documented guarantee: if that order ever flips, typecheck
// silently falls back to TS 6 while CI stays green. Asserting the version here turns "is this really
// TS 7?" into a verifiable fact instead of an assumption.
// oxlint-disable no-console -- this file is a CLI wrapper; its output is the result
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const tscBin = fileURLToPath(new URL("node_modules/.bin/tsc", root));

const expected = JSON.parse(
    readFileSync(new URL("node_modules/@typescript/native/package.json", root), "utf8")
).version;
let actual;
try {
    actual = execFileSync(tscBin, ["--version"], { encoding: "utf8" })
        .trim()
        .replace(/^Version\s+/, "");
} catch (error) {
    console.error(`typecheck failed: cannot run ${tscBin} (${error.message.split("\n")[0]}), run npm ci first.`);
    process.exit(1);
}

const major = (v) => v.split(".")[0];
if (major(actual) !== major(expected)) {
    console.error(`typecheck failed: node_modules/.bin/tsc reports ${actual} but @typescript/native is ${expected}`);
    console.error("npm's bin conflict resolution did not pick the native TypeScript — check the two aliases.");
    process.exit(1);
}
console.log(`tsc ${actual} (@typescript/native ${expected})`);

try {
    execFileSync(tscBin, ["--noEmit", "-p", "tsconfig.json"], { stdio: "inherit", cwd: fileURLToPath(root) });
} catch (error) {
    process.exit(error.status ?? 1);
}
