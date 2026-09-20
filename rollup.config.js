import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const config = [
    {
        input: "./src/index.ts",
        // transpiled typescript in umd and es format
        output: [
            { file: "dist/maxrects-packer.js", name: "MaxRectsPacker", format: "umd", sourcemap: true },
            { file: "dist/maxrects-packer.mjs", format: "es", sourcemap: true }
        ],
        plugins: [
            typescript({
                tsconfig: "./tsconfig.build.json"
            })
        ]
    },
    {
        input: "./src/index.ts",
        // uglified transpiled typescript in commonjs
        // 同时产出 .cjs：package.json 是 "type": "module"，包内 .js 会被 Node 当作 ESM，
        // 只有 .cjs 后缀能被 require() 正确加载；.min.js 保持不变供 CDN/<script> 使用
        output: [
            { file: "dist/maxrects-packer.min.js", format: "cjs", sourcemap: false },
            { file: "dist/maxrects-packer.cjs", format: "cjs", sourcemap: false }
        ],
        plugins: [
            terser(),
            typescript({
                tsconfig: "./tsconfig.build.json"
            })
        ]
    }
];
export default config;
