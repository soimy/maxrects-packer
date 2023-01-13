import typescript from "rollup-plugin-typescript2";
import terser from "@rollup/plugin-terser";

const config = [
    {
        input: "./src/index.ts",
        // transpiled typescript in umd and es format
        output: [
            { file: "dist/maxrects-packer.js", name: "MaxRectsPacker", format: "umd", sourcemap: true },
            { file: "dist/maxrects-packer.mjs", format: "es", sourcemap: true }
        ],
        plugins: [ typescript()]
    },
    {
        input: "./src/index.ts",
        // uglified transpiled typescript in commonjs
        output: [
            { file: "dist/maxrects-packer.min.js", format: "cjs", sourcemap: false }
        ],
        plugins: [ terser(), typescript() ]
    }
];
export default config;
