// Post-build self-check: the published bundles promise no engine requirement beyond ES5 (see
// docs/contributor/compatibility.md), but `target: es5` in tsconfig.build.json downlevels *syntax*
// only. A runtime API newer than ES5 stays in the bundle as written and throws on an ES5 engine,
// and the specs never touch dist/, so nothing else would notice.
//
// The scan is textual, so it cannot tell a call from a feature check. `Object.getOwnPropertySymbols`
// is therefore absent from the list below: `src/geom/Rectangle.ts` calls it behind a
// `typeof … === "function"` guard, which is the supported way to use a post-ES5 API. `Object.assign`
// is absent for the same reason — the `__assign` helper `tsc` emits carries its own ES5 fallback.
// oxlint-disable no-console -- this file is a post-build CLI; printing the result is its output
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);

// Each entry is [label, needle]; the needle is matched literally against the bundle text.
const FORBIDDEN = [
    ["Array.prototype.find", ".find("],
    ["Array.prototype.findIndex", ".findIndex("],
    ["Array.prototype.includes", ".includes("],
    ["Array.prototype.fill", ".fill("],
    ["Array.prototype.flat", ".flat("],
    ["Array.prototype.flatMap", ".flatMap("],
    ["String.prototype.includes", ".includes("],
    ["String.prototype.startsWith", ".startsWith("],
    ["String.prototype.endsWith", ".endsWith("],
    ["String.prototype.repeat", ".repeat("],
    ["String.prototype.padStart", ".padStart("],
    ["String.prototype.padEnd", ".padEnd("],
    ["Array.from", "Array.from("],
    ["Array.of", "Array.of("],
    ["Object.entries", "Object.entries("],
    ["Object.values", "Object.values("],
    ["Object.fromEntries", "Object.fromEntries("],
    ["Object.getOwnPropertyDescriptors", "Object.getOwnPropertyDescriptors("],
    ["Object.setPrototypeOf", "Object.setPrototypeOf("],
    ["Reflect", "Reflect."],
    ["Number.isInteger", "Number.isInteger("],
    ["Number.isNaN", "Number.isNaN("],
    ["Number.isFinite", "Number.isFinite("],
    ["Symbol.iterator", "Symbol.iterator"],
    ["Map", "new Map("],
    ["Set", "new Set("],
    ["WeakMap", "new WeakMap("],
    ["WeakSet", "new WeakSet("],
    ["Promise", "new Promise("]
];

const BUNDLES = [
    "dist/maxrects-packer.js",
    "dist/maxrects-packer.min.js",
    "dist/maxrects-packer.mjs",
    "dist/maxrects-packer.cjs"
];
const failures = [];

for (const bundle of BUNDLES) {
    const source = readFileSync(fileURLToPath(new URL(bundle, root)), "utf8");
    const hits = FORBIDDEN.filter(([, needle]) => source.includes(needle)).map(([label]) => label);
    if (hits.length > 0) failures.push(`${bundle} uses post-ES5 runtime APIs: ${[...new Set(hits)].join(", ")}`);
    else console.log(`  ✓ ${bundle} → no post-ES5 runtime API`);
}

if (failures.length > 0) {
    console.error("ES5 compatibility check failed:");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exit(1);
}
console.log("ES5 compatibility check passed");
