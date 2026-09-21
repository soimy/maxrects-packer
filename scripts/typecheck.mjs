// typecheck 包装器：先断言 PATH 上的 tsc 就是 @typescript/native（原生 TS 7），再跑类型检查。
//
// 背景：package.json 用 npm 别名装了两套 TypeScript——
//   typescript          -> @typescript/typescript6（给 typedoc / ts-jest / rollup 插件用 JS API）
//   @typescript/native  -> typescript@7（原生 tsc）
// 两者都声明了名为 tsc 的 bin，npm 目前把 node_modules/.bin/tsc 链到原生那个，
// 但 bin 冲突的消解顺序不是 npm 的文档化保证：一旦顺序变化，typecheck 会静默退回 TS 6
// 而 CI 依旧全绿。所以这里显式断言版本，让"跑的是不是 TS 7"变成可验证的事实。
// oxlint-disable no-console -- 本文件是 CLI 包装器，输出即结果
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("..", import.meta.url);
const tscBin = fileURLToPath(new URL("node_modules/.bin/tsc", root));

const expected = JSON.parse(
    readFileSync(new URL("node_modules/@typescript/native/package.json", root), "utf8")
).version;
let actual;
try {
    actual = execFileSync(tscBin, ["--version"], { encoding: "utf8" })
        .trim()
        .replace(/^Version\s+/, "");
} catch (error) {
    console.error(`typecheck 失败：无法执行 ${tscBin}（${error.message.split("\n")[0]}），请先 npm ci。`);
    process.exit(1);
}

const major = (v) => v.split(".")[0];
if (major(actual) !== major(expected)) {
    console.error(`typecheck 失败：node_modules/.bin/tsc 跑的是 ${actual}，但 @typescript/native 是 ${expected}`);
    console.error("说明 npm 的 bin 冲突消解没有选中原生 TypeScript，请检查两套 typescript 别名的安装结果。");
    process.exit(1);
}
console.log(`tsc ${actual}（@typescript/native ${expected}）`);

try {
    execFileSync(tscBin, ["--noEmit", "-p", "tsconfig.json"], { stdio: "inherit", cwd: fileURLToPath(root) });
} catch (error) {
    process.exit(error.status ?? 1);
}
