// 构建后自检：package.json 里声明的入口必须真的能被 Node 加载到全部公开 API。
// 背景：2.x 长期存在 "type": "module" + .js 后缀导致 require() 拿到空对象的问题，
// 而单元测试只跑 src、不碰 dist，所以 3 年多没人发现。
// oxlint-disable no-console -- 本文件是构建后自检 CLI，打印结果就是它的输出
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
    if (missing.length > 0) failures.push(`${label} 缺少导出: ${missing.join(", ")}`);
    else console.log(`  ✓ ${label} → ${names.length} 个导出`);
};

for (const field of ["main", "module", "types"]) {
    const file = fileURLToPath(new URL(pkg[field], root));
    if (!existsSync(file)) failures.push(`package.json "${field}" 指向的文件不存在: ${pkg[field]}`);
}

if (failures.length === 0) {
    check(`require(${pkg.main})`, Object.keys(require(fileURLToPath(new URL(pkg.main, root)))));
    const esm = await import(new URL(pkg.module, root).href);
    check(`import(${pkg.module})`, Object.keys(esm));
}

if (failures.length > 0) {
    console.error("入口自检失败：");
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exit(1);
}
console.log("入口自检通过");
