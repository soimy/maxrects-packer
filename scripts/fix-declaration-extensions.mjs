// Declaration extension fix-up, run from `postbuild`.
//
// `@rollup/plugin-typescript` emits one `.d.ts` per source module and keeps the relative specifiers
// extensionless, while the package is `"type": "module"`. Under `moduleResolution: node16`/`nodenext`
// that is an error inside the published declarations (TS2834/TS2835), so a consumer with
// `skipLibCheck: false` fails on this package's own files. Appending `.js` is the ESM-correct form:
// TypeScript maps `./x.js` to `./x.d.ts`, and the runtime artifacts are bundles without relative
// imports at all, so the extension only ever has to resolve as a declaration.
// oxlint-disable no-console -- this file is a build step; its output is the result
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist", import.meta.url));

const declarationsUnder = (directory) =>
    readdirSync(directory).flatMap((entry) => {
        const path = join(directory, entry);
        return statSync(path).isDirectory() ? declarationsUnder(path) : path.endsWith(".d.ts") ? [path] : [];
    });

// The two forms the compiler emits for a relative reference: `from "./x"` and `import("./x")`.
const REFERENCE = /(\bfrom\s*|\bimport\s*\(\s*)(["'])(\.{1,2}\/[^"']*)\2/g;
const HAS_EXTENSION = /\.(js|mjs|cjs|json)$/;

let changed = 0;
let specifiers = 0;

for (const file of declarationsUnder(dist)) {
    const source = readFileSync(file, "utf8");
    const fixed = source.replace(REFERENCE, (match, prefix, quote, specifier) => {
        if (HAS_EXTENSION.test(specifier)) return match;
        // Every specifier has to point at a sibling declaration. Failing here beats writing something
        // that resolves nowhere — a directory import, say — and shipping it.
        if (!existsSync(resolve(dirname(file), `${specifier}.d.ts`))) {
            throw new Error(`${file}: "${specifier}" has no sibling declaration to resolve to`);
        }
        specifiers++;
        return `${prefix}${quote}${specifier}.js${quote}`;
    });

    // Nothing may be left extensionless: an unhandled spelling would otherwise ship silently.
    for (const [, prefix, quote, specifier] of fixed.matchAll(REFERENCE)) {
        if (!HAS_EXTENSION.test(specifier)) throw new Error(`${file}: "${specifier}" was not given an extension`);
        void prefix;
        void quote;
    }

    if (fixed !== source) {
        writeFileSync(file, fixed);
        changed++;
    }
}

console.log(`  ✓ declarations: ${specifiers} relative specifier(s) in ${changed} file(s) given a .js extension`);
