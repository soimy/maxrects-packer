// Package-level entry gate: install the real tarball into a temporary consumer project, then verify
// the entry points **by package name**.
//
// Why checking file paths is not enough: this class of bug lives in package metadata plus Node's
// resolution rules, not in the files themselves (dist/*.js existed and had the right contents, yet
// require("maxrects-packer") returned an empty object). So the whole chain has to run here:
// npm pack -> install -> require/import by package name.
// oxlint-disable no-console -- this file is a CI gate; its output is the result
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
const rect: IRectangle = new Rectangle(8, 8);
export const summary = [saved.length, bins.length, bin.width, oversized.width, rect.width];
`;
const root = fileURLToPath(new URL("..", import.meta.url));
const workdir = mkdtempSync(join(tmpdir(), "maxrects-packer-verify-"));

const run = (cmd, args, options = {}) => execFileSync(cmd, args, { encoding: "utf8", ...options }).trim();

try {
    // 1) Produce the real tarball (this also checks that package.json files/main/module/types agree)
    const tarballName = run("npm", ["pack", "--pack-destination", workdir], { cwd: root }).split("\n").pop();
    const tarball = join(workdir, tarballName);
    console.log(`  ✓ npm pack -> ${tarballName}`);

    // 2) Install into a brand-new consumer project (the temporary directory itself)
    execFileSync("npm", ["init", "-y"], { cwd: workdir, stdio: "ignore" });
    writeFileSync(join(workdir, "package.json"), JSON.stringify({ name: "consumer", private: true }, null, 2));
    run("npm", ["install", "--no-save", "--no-package-lock", "--no-audit", "--no-fund", tarball], { cwd: workdir });
    console.log("  ✓ installed into the temporary consumer project");

    // 3) Verify CJS by package name — this is the path that was broken historically
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

    // 4) Verify ESM by package name (Node loads main through CJS interop; named exports come from cjs-module-lexer)
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

    // 5) Verify the published types by package name. package.json "types" decides what a TypeScript
    // consumer resolves, and it pointed at the declaration of src/maxrects-packer.ts instead of the
    // barrel's, so six of the nine documented exports could not be imported while every runtime check
    // above stayed green. Only compiling an import of them catches that.
    writeFileSync(join(workdir, "consumer.ts"), TYPE_FIXTURE);
    const program = ts.createProgram([join(workdir, "consumer.ts")], {
        strict: true,
        noEmit: true,
        skipLibCheck: false,
        target: ts.ScriptTarget.ES2019,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler
    });
    const errors = ts.getPreEmitDiagnostics(program).filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (errors.length > 0) {
        for (const error of errors) {
            const message = ts.flattenDiagnosticMessageText(error.messageText, " ");
            const file = error.file ? error.file.fileName.replace(`${workdir}/`, "") : "";
            const line =
                error.file && error.start !== undefined
                    ? error.file.getLineAndCharacterOfPosition(error.start).line + 1
                    : 0;
            console.error(`     ${file}:${line} ${message}`);
        }
        throw new Error(`the published types reject the documented imports (${errors.length} error(s))`);
    }
    console.log("  ✓ the published types accept the documented imports");

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
