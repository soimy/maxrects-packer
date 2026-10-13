// CommonJS declaration set, run from `postbuild` right after `fix-declaration-extensions.mjs`.
//
// The package is `"type": "module"`, so every emitted `.d.ts` is ESM-flavoured to TypeScript and the
// `require` condition of the `exports` map cannot point at one: a `.cts` consumer compiled under
// `node16`/`nodenext` then fails with TS1479 ("the referenced file is an ECMAScript module and
// cannot be imported with 'require'") or TS1471 for `import … = require(…)` (issue #98). A `.d.cts`
// is CommonJS-flavoured whatever `package.json` says, so the require branch gets a parallel
// declaration set.
//
// The parallel set is a copy per module rather than one bundled barrel, because the runtime `.cjs`
// bundle has no relative imports at all: the declarations only ever have to describe shapes, and
// TypeScript maps a `./x.cjs` specifier to the sibling `./x.d.cts` without needing a runtime file.
// That keeps this step mechanical — rewrite the already-.js-extensioned specifiers to `.cjs`.
// oxlint-disable no-console -- this file is a build step; its output is the result
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

const declarationsUnder = (directory, extension) =>
    readdirSync(directory).flatMap((entry) => {
        const path = join(directory, entry);
        return statSync(path).isDirectory()
            ? declarationsUnder(path, extension)
            : path.endsWith(extension)
              ? [path]
              : [];
    });

const REFERENCE = /(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"']*)\2/g;

const sources = declarationsUnder(dist, ".d.ts").sort();
if (sources.length === 0) throw new Error("no .d.ts declaration was found in dist — run the build first");
const targets = new Set(sources.map((file) => file.replace(/\.d\.ts$/, ".d.cts")));

let specifiers = 0;

for (const source of sources) {
    const target = source.replace(/\.d\.ts$/, ".d.cts");
    const fixed = readFileSync(source, "utf8").replace(REFERENCE, (match, prefix, quote, specifier) => {
        if (!specifier.endsWith(".js")) {
            throw new Error(
                `${source}: "${specifier}" is not a .js reference — run fix-declaration-extensions.mjs first`
            );
        }
        const cjs = specifier.slice(0, -3) + ".cjs";
        // Every rewritten specifier has to land on a sibling of the parallel set, or the require
        // branch would ship a declaration that resolves nowhere.
        if (!targets.has(resolve(dirname(target), cjs).replace(/\.cjs$/, ".d.cts"))) {
            throw new Error(`${source}: "${cjs}" has no sibling .d.cts declaration to resolve to`);
        }
        specifiers++;
        return `${prefix}${quote}${cjs}${quote}`;
    });

    if (!existsSync(target) || readFileSync(target, "utf8") !== fixed) writeFileSync(target, fixed);
}

// A `.d.cts` whose `.d.ts` is gone is a leftover from an earlier build (the build does not clean
// dist on its own) and would ship as an artifact the pinned file list does not expect.
let removed = 0;
for (const stale of declarationsUnder(dist, ".d.cts")) {
    if (!existsSync(stale.replace(/\.d\.cts$/, ".d.ts"))) {
        rmSync(stale);
        removed++;
    }
}

console.log(
    `  ✓ CJS declarations: ${targets.size} file(s), ${specifiers} specifier(s) rewritten to .cjs` +
        (removed > 0 ? `, ${removed} stale file(s) removed` : "")
);
