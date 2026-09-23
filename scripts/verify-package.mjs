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

const EXPECTED = ["Bin", "MaxRectsBin", "MaxRectsPacker", "OversizedElementBin", "PACKING_LOGIC", "Rectangle"];
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
