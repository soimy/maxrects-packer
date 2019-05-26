import { ts, dts } from "rollup-plugin-dts";
import uglify from "rollup-plugin-uglify-es";

const config = [
    {
        input: "./src/index.ts",
        // transpiled typescript in umd and es format
        output: [
            { file: "dist/maxrects-packer.js", name: "MaxRectsPacker", format: "umd", sourcemap: true },
            { file: "dist/maxrects-packer.mjs", format: "es", sourcemap: true }
        ],
        plugins: [ ts() ]
    },
    {
        input: "./src/index.ts",
        // uglified transpiled typescript in commonjs
        output: [
            { file: "dist/maxrects-packer.min.js", format: "cjs", sourcemap: false }
        ],
        plugins: [ uglify(), ts() ]
    },
    {
        input: "./src/index.ts",
        // bundled `.d.ts` file
        output: [{ file: "dist/maxrects-packer.d.ts", format: "es" }],
        plugins: [ dts() ]
    }
];
export default config;
