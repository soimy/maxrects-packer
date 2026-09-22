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
        // Also emit .cjs: package.json is "type": "module", so a .js file inside the package is parsed
        // as ESM by Node and only the .cjs extension can be require()'d; .min.js stays as-is for
        // CDN/<script> use
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
