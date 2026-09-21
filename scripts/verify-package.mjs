// package 级入口门禁：把真实 tarball 装进一个临时消费者工程，再用**包名**验证入口。
//
// 为什么不能只验文件路径：这一系列 bug 的本质是 package metadata + Node 解析，
// 而不是文件本身不可用（历史上 dist/*.js 都在、内容也对，只是 require('maxrects-packer') 拿到空对象）。
// 因此这里必须走 npm pack -> 安装 -> require/import 包名的完整链路。
// oxlint-disable no-console -- 本文件是 CI 门禁，输出即结果
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
    // 1) 打出真实 tarball（这一步同时验证 package.json 的 files / main / module / types 自洽）
    const tarballName = run("npm", ["pack", "--pack-destination", workdir], { cwd: root }).split("\n").pop();
    const tarball = join(workdir, tarballName);
    console.log(`  ✓ npm pack -> ${tarballName}`);

    // 2) 装进一个全新的消费者工程（就用临时目录本身）
    execFileSync("npm", ["init", "-y"], { cwd: workdir, stdio: "ignore" });
    writeFileSync(join(workdir, "package.json"), JSON.stringify({ name: "consumer", private: true }, null, 2));
    run("npm", ["install", "--no-save", "--no-package-lock", "--no-audit", "--no-fund", tarball], { cwd: workdir });
    console.log("  ✓ 已安装到临时消费者工程");

    // 3) 用包名验证 CJS —— 这正是历史上坏掉的那条路径
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
    if (missingCjs.length > 0) throw new Error(`require("maxrects-packer") 缺少导出: ${missingCjs.join(", ")}`);
    if (cjs.bins !== 1) throw new Error(`require("maxrects-packer") 能加载但功能异常：期望 1 个 bin，得到 ${cjs.bins}`);
    console.log(`  ✓ require("maxrects-packer") -> ${cjs.keys.length} 个导出，实跑打包正常`);

    // 4) 用包名验证 ESM（Node 会按 CJS 互操作加载 main，命名导出由 cjs-module-lexer 提供）
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
    ).filter((key) => key !== "default");
    const missingEsm = EXPECTED.filter((name) => !esmKeys.includes(name));
    if (missingEsm.length > 0) throw new Error(`import("maxrects-packer") 缺少具名导出: ${missingEsm.join(", ")}`);
    console.log(`  ✓ import("maxrects-packer") -> ${esmKeys.length} 个具名导出`);

    console.log("package 入口门禁通过");
} catch (error) {
    console.error("package 入口门禁失败：");
    console.error(`  ✗ ${error.message.split("\n")[0]}`);
    for (const stream of [error.stdout, error.stderr]) {
        if (stream) console.error(String(stream).trim());
    }
    process.exitCode = 1;
} finally {
    rmSync(workdir, { recursive: true, force: true });
}
