// Post-build self-check: every entry point declared in package.json must actually load the whole
// public API through Node.
// Background: 2.x shipped "type": "module" next to a .js main for years, so require() returned an
// empty object — and the unit tests only run src/ and never touch dist/, so nobody noticed.
// oxlint-disable no-console -- this file is a post-build CLI; printing the result is its output
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = new URL("..", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

const EXPECTED = ["Bin", "MaxRectsBin", "MaxRectsPacker", "OversizedElementBin", "PACKING_LOGIC", "Rectangle"];
const failures = [];

const check = (label, names) => {
    const missing = EXPECTED.filter((name) => !names.includes(name));
    if (missing.length > 0) failures.push(`${label} is missing exports: ${missing.join(", ")}`);
    else console.log(`  ✓ ${label} → ${names.length} exports`);
};

for (const field of ["main", "module", "types"]) {
    const file = fileURLToPath(new URL(pkg[field], root));
    if (!existsSync(file)) failures.push(`package.json "${field}" points at a missing file: ${pkg[field]}`);
}

// The `exports` map is what a modern Node or TypeScript resolver actually reads — `main`/`module`/
// `types` above only keep node10 and bundler-style resolvers working. Each condition needs a runtime
// file *and* a declaration of the matching flavour: the `.d.ts` barrel is ESM because the package is
// `"type": "module"`, so the require branch has to reach the CommonJS-flavoured `.d.cts` set or a
// `.cts` consumer goes back to TS1479/TS1471 (issue #98).
const conditions = pkg.exports?.["."] ?? {};
for (const [condition, declaration] of [
    ["import", ".d.ts"],
    ["require", ".d.cts"]
]) {
    const branch = conditions[condition];
    if (!branch || typeof branch !== "object") {
        failures.push(`package.json "exports".".".${condition} is missing`);
        continue;
    }
    for (const field of ["types", "default"]) {
        const target = branch[field];
        if (typeof target !== "string") failures.push(`package.json "exports".".".${condition}.${field} is missing`);
        else if (!existsSync(fileURLToPath(new URL(target, root))))
            failures.push(`"exports".".".${condition}.${field} points at a missing file: ${target}`);
    }
    if (typeof branch.types === "string" && !branch.types.endsWith(declaration)) {
        failures.push(`"exports".".".${condition}.types must name a ${declaration} declaration: ${branch.types}`);
    }
}
// Tooling reads the manifest through the map; sealing it off would break those consumers.
if (pkg.exports?.["./package.json"] !== "./package.json") {
    failures.push(`"exports" must keep "./package.json" reachable, found: ${pkg.exports?.["./package.json"]}`);
}

if (failures.length === 0) {
    check(`require(${pkg.main})`, Object.keys(require(fileURLToPath(new URL(pkg.main, root)))));
    const esm = await import(new URL(pkg.module, root).href);
    check(`import(${pkg.module})`, Object.keys(esm));
}

if (failures.length > 0) {
    console.error("Entry point self-check failed:");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exit(1);
}
console.log("Entry point self-check passed");
