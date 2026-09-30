// Package-level entry gate: install the real tarball into a temporary consumer project, then verify
// the entry points **by package name**.
//
// Why checking file paths is not enough: this class of bug lives in package metadata plus Node's
// resolution rules, not in the files themselves (dist/*.js existed and had the right contents, yet
// require("maxrects-packer") returned an empty object). So the whole chain has to run here:
// npm pack -> install -> require/import by package name.
// oxlint-disable no-console -- this file is a CI gate; its output is the result
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const EXPECTED = ["Bin", "MaxRectsBin", "MaxRectsPacker", "OversizedElementBin", "PACKING_LOGIC", "Rectangle"];
// The documented API, imported by package name — every name src/index.ts re-exports, used so the
// fixture cannot pass on an unused import.
const TYPE_FIXTURE = `import { Bin, MaxRectsBin, MaxRectsPacker, OversizedElementBin, PACKING_LOGIC, Rectangle } from "maxrects-packer";
import type { IBin, IOption, IRectangle } from "maxrects-packer";

const options: IOption = { smart: true, pot: true, square: false, allowRotation: false, tag: false, border: 0, logic: PACKING_LOGIC.MAX_EDGE };
const packer = new MaxRectsPacker(64, 64, 0, options);
packer.add(new Rectangle(16, 16));
const saved: IBin[] = packer.save();
const bins: Bin<Rectangle>[] = packer.bins;
const bin = new MaxRectsBin(64, 64, 0, options);
const oversized = new OversizedElementBin(128, 128, null);
// The data argument is optional in the runtime (a JavaScript caller can leave it out and gets null),
// so the published declaration has to accept the two-argument form too — this line is what fails if
// somebody narrows it back to a required parameter.
const oversizedWithoutData = new OversizedElementBin(128, 128);
const rect: IRectangle = new Rectangle(8, 8);
// The copy helper the bins' clone() uses is part of the public surface, so its declaration is pinned
// too: a static that lost its generic, or its parameter, fails on this line.
const copied: Rectangle = Rectangle.Clone(new Rectangle(4, 4));
// The generic has to survive: a subclass must come back as that subclass, extra field included, or
// this line stops compiling.
class SheetRect extends Rectangle {
    label = "sheet";
}
const copiedSheet: SheetRect = Rectangle.Clone(new SheetRect(4, 4));
export const summary = [saved.length, bins.length, bin.width, oversized.width, oversizedWithoutData.width, rect.width, copied.width, copiedSheet.label];
`;
// What `npm pack` is meant to produce, sorted. Almost all of it comes from the `files` allowlist in
// package.json; `package.json`, `README.md` and `LICENSE` are npm's own additions. Edit this list only
// together with the allowlist — it is the record of what consumers download.
const PUBLISHED_FILES = [
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
    "assets/favicon.ico",
    "dist/abstract-bin.d.ts",
    "dist/geom/Rectangle.d.ts",
    "dist/index.d.ts",
    "dist/maxrects-bin.d.ts",
    "dist/maxrects-packer.cjs",
    "dist/maxrects-packer.d.ts",
    "dist/maxrects-packer.js",
    "dist/maxrects-packer.js.map",
    "dist/maxrects-packer.min.js",
    "dist/maxrects-packer.mjs",
    "dist/maxrects-packer.mjs.map",
    "dist/oversized-element-bin.d.ts",
    "dist/types.d.ts",
    "package.json",
    "src/abstract-bin.ts",
    "src/geom/Rectangle.ts",
    "src/index.ts",
    "src/maxrects-bin.ts",
    "src/maxrects-packer.ts",
    "src/oversized-element-bin.ts",
    "src/types.ts",
    "tsconfig.build.json",
    "tsconfig.json",
    "typedoc.json"
].sort();

const root = fileURLToPath(new URL("..", import.meta.url));
const workdir = mkdtempSync(join(tmpdir(), "maxrects-packer-verify-"));

const run = (cmd, args, options = {}) => execFileSync(cmd, args, { encoding: "utf8", ...options }).trim();

try {
    // 1) Produce the real tarball (this also checks that package.json files/main/module/types agree)
    const tarballName = run("npm", ["pack", "--pack-destination", workdir], { cwd: root }).split("\n").pop();
    const tarball = join(workdir, tarballName);
    console.log(`  ✓ npm pack -> ${tarballName}`);

    // 2) The tarball carries exactly the files that are meant to ship. A `files` allowlist decides this,
    // so the two quiet mistakes are a path added to it (the documentation site's source tree, the
    // uncompressed PNGs) and an entry dropped from it (`src/`, a tsconfig) — neither of which any other
    // check would notice, since the entry points themselves would still resolve.
    const published = JSON.parse(run("npm", ["pack", "--dry-run", "--json"], { cwd: root }))[0]
        .files.map((file) => file.path)
        .sort();
    const added = published.filter((path) => !PUBLISHED_FILES.includes(path));
    const dropped = PUBLISHED_FILES.filter((path) => !published.includes(path));
    if (added.length > 0 || dropped.length > 0) {
        const list = (paths) =>
            paths.length > 8 ? `${paths.slice(0, 8).join(", ")} …and ${paths.length - 8} more` : paths.join(", ");
        const detail = [
            added.length > 0 ? `not expected: ${list(added)}` : null,
            dropped.length > 0 ? `missing: ${list(dropped)}` : null
        ].filter(Boolean);
        throw new Error(
            `the tarball holds ${published.length} files, not the ${PUBLISHED_FILES.length} intended — ${detail.join("; ")}`
        );
    }
    console.log(`  ✓ npm pack --dry-run lists the ${published.length} intended files`);

    // 3) Install into a brand-new consumer project (the temporary directory itself)
    execFileSync("npm", ["init", "-y"], { cwd: workdir, stdio: "ignore" });
    writeFileSync(join(workdir, "package.json"), JSON.stringify({ name: "consumer", private: true }, null, 2));
    run("npm", ["install", "--no-save", "--no-package-lock", "--no-audit", "--no-fund", tarball], { cwd: workdir });
    console.log("  ✓ installed into the temporary consumer project");

    // 4) Verify CJS by package name — this is the path that was broken historically
    const cjs = JSON.parse(
        run(
            "node",
            [
                "-e",
                `const m = require("maxrects-packer");
             const packer = new m.MaxRectsPacker(64, 64, 0, { smart: false, pot: false });
             packer.add(32, 32, {});
             console.log(JSON.stringify({ keys: Object.keys(m), bins: packer.bins.length }));`
            ],
            { cwd: workdir }
        )
    );
    const missingCjs = EXPECTED.filter((name) => !cjs.keys.includes(name));
    if (missingCjs.length > 0)
        throw new Error(`require("maxrects-packer") is missing exports: ${missingCjs.join(", ")}`);
    if (cjs.bins !== 1)
        throw new Error(`require("maxrects-packer") loaded but misbehaves: expected 1 bin, got ${cjs.bins}`);
    console.log(`  ✓ require("maxrects-packer") -> ${cjs.keys.length} exports, real packing run OK`);

    // 5) Verify ESM by package name (Node loads main through CJS interop; named exports come from cjs-module-lexer)
    // Node 23+ also adds a synthetic "module.exports" key to the namespace of a CommonJS module, so the
    // raw key count is 6 on Node 20/22 and 7 on Node 24. Drop it: this gate is about which real exports
    // are reachable by name, and a count that changes with the Node version reads like a regression.
    const esmKeys = JSON.parse(
        run(
            "node",
            [
                "--input-type=module",
                "-e",
                `import("maxrects-packer").then((m) => console.log(JSON.stringify(Object.keys(m))));`
            ],
            {
                cwd: workdir
            }
        )
    ).filter((key) => key !== "default" && key !== "module.exports");
    const missingEsm = EXPECTED.filter((name) => !esmKeys.includes(name));
    if (missingEsm.length > 0)
        throw new Error(`import("maxrects-packer") is missing named exports: ${missingEsm.join(", ")}`);
    console.log(`  ✓ import("maxrects-packer") -> ${esmKeys.length} named exports`);

    // 6) Verify the published types by package name, in every resolution mode a consumer can use.
    // package.json "types" decides what a TypeScript consumer resolves, and it pointed at the
    // declaration of src/maxrects-packer.ts instead of the barrel's, so six of the nine documented
    // exports could not be imported while every runtime check above stayed green. Only compiling an
    // import of them catches that. The declarations have to satisfy the strictest modes: this package
    // is `"type": "module"`, so its relative imports need explicit extensions under node16/nodenext
    // (postbuild writes them) or a consumer with skipLibCheck: false sees TS2834/TS2835.
    // The consumer project is ESM so that node16 and nodenext read the fixture as ESM too.
    writeFileSync(
        join(workdir, "package.json"),
        JSON.stringify({ name: "consumer", private: true, type: "module" }, null, 2)
    );
    writeFileSync(join(workdir, "consumer.ts"), TYPE_FIXTURE);

    const MODES = [
        { name: "bundler", module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler },
        { name: "node16", module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16 },
        { name: "nodenext", module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext }
    ];
    const compileFixture = ({ module, moduleResolution }) => {
        const program = ts.createProgram([join(workdir, "consumer.ts")], {
            strict: true,
            noEmit: true,
            skipLibCheck: false,
            target: ts.ScriptTarget.ES2019,
            module,
            moduleResolution
        });
        return ts.getPreEmitDiagnostics(program).filter((d) => d.category === ts.DiagnosticCategory.Error);
    };
    const reportErrors = (errors) => {
        for (const error of errors) {
            const message = ts.flattenDiagnosticMessageText(error.messageText, " ");
            const file = error.file ? error.file.fileName.replace(`${workdir}/`, "") : "";
            const line =
                error.file && error.start !== undefined
                    ? error.file.getLineAndCharacterOfPosition(error.start).line + 1
                    : 0;
            console.error(`     ${file}:${line} ${message}`);
        }
    };

    for (const mode of MODES) {
        const errors = compileFixture(mode);
        if (errors.length > 0) {
            reportErrors(errors);
            throw new Error(
                `the published types reject the documented imports under ${mode.name} (${errors.length} error(s))`
            );
        }
    }
    console.log(`  ✓ the published types accept the documented imports (${MODES.map((mode) => mode.name).join(", ")})`);

    // 7) Run the documentation examples marked with `<!-- docs-example: name -->`, against the package
    // installed by name. The guides are the first thing a user copies, and nothing else would notice an
    // example that stopped working: the test specs import `../src`, so a broken README or guide snippet
    // rots silently while every gate stays green. Every page is scanned rather than a hand-kept list of
    // files, because a marker added to a guide the list does not name would escape the check while
    // looking covered — `docs/api/` is generated, and `spec/`/`plans/` are the records `srcExclude` keeps
    // out of the site.
    const UNPUBLISHED = new Set(["api", "spec", "plans"]);
    const walkMarkdown = (dir) =>
        readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            if (!entry.isDirectory()) return entry.name.endsWith(".md") ? [join(dir, entry.name)] : [];
            return UNPUBLISHED.has(entry.name) ? [] : walkMarkdown(join(dir, entry.name));
        });
    const examples = [join(root, "README.md"), ...walkMarkdown(join(root, "docs"))].flatMap((source) => {
        const matches = [
            ...readFileSync(source, "utf8").matchAll(/<!-- docs-example: ([\w-]+) -->\n+```js\n([\s\S]*?)```/g)
        ];
        return matches.map(([, name, code]) => ({ name, code }));
    });
    if (examples.length === 0) throw new Error("no runnable documentation example was found");
    for (const example of examples) {
        const script = join(workdir, `example-${example.name}.mjs`);
        writeFileSync(script, example.code);
        run("node", [script], { cwd: workdir });
    }
    console.log(`  ✓ documentation examples run (${examples.map((example) => example.name).join(", ")})`);

    console.log("Package entry gate passed");
} catch (error) {
    console.error("Package entry gate failed:");
    console.error(`  ✗ ${error.message.split("\n")[0]}`);
    for (const stream of [error.stdout, error.stderr]) {
        if (stream) console.error(String(stream).trim());
    }
    process.exitCode = 1;
} finally {
    rmSync(workdir, { recursive: true, force: true });
}
