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
