// typecheck wrapper: assert that the TypeScript toolchain is what package.json declares before
// running the type check.
//
// Background: package.json installs two TypeScript packages through npm aliases —
//   typescript          -> @typescript/typescript6 (JS compiler API for typedoc / rollup)
//   @typescript/native  -> typescript@7 (native tsc)
//
// Two silent failures are turned into verifiable facts here:
//   1. package-lock.json must record those aliases as aliases. npm will not reconcile a changed
//      package identity while the locked version still fits the new range (see AGENTS.md, "Known
//      pitfalls"): it reports "up to date" and keeps the pre-alias package, so npm ci installs
//      something other than what package.json asks for while CI stays green. Only the package name
//      is compared here, not the version — npm ci already fails on a lockfile version that does not
//      satisfy the declared range ("Invalid: lock file's … does not satisfy …").
//   2. node_modules/.bin/tsc must really be the native TS 7 binary. That link is contested: the
//      `typescript` alias pulls in @typescript/old, which declares a `tsc` bin of its own, and how
//      npm resolves such a conflict is not a documented guarantee. If the order ever flips,
//      typecheck silently falls back to TS 6 while CI stays green.
// oxlint-disable no-console -- this file is a CLI wrapper; its output is the result
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const tscBin = fileURLToPath(new URL("node_modules/.bin/tsc", root));

const declared = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const lock = JSON.parse(readFileSync(new URL("package-lock.json", root), "utf8"));

for (const [name, spec] of Object.entries({ ...declared.dependencies, ...declared.devDependencies })) {
    if (!spec.startsWith("npm:")) continue;
    // An alias spec is `npm:<target>@<range>`, and the target may be scoped, so split on the last `@`.
    const alias = spec.slice(4);
    const at = alias.lastIndexOf("@");
    const target = at > 0 ? alias.slice(0, at) : alias;
    const entry = lock.packages[`node_modules/${name}`];
    // A plain entry carries no `name`, and then the recorded package is the key itself.
    const recorded = entry ? (entry.name ?? name) : undefined;
    if (recorded !== target) {
        console.error(`typecheck failed: package.json aliases "${name}" to "${target}",`);
        console.error(`but package-lock.json resolves it to ${recorded ? `"${recorded}"` : "no entry"}.`);
        console.error("Delete that entry and re-run npm install --package-lock-only (see AGENTS.md).");
        process.exit(1);
    }
    console.log(`alias ok: ${name} -> ${target}@${entry.version}`);
}

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
