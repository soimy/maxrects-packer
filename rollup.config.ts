import ts from "rollup-plugin-ts";
import uglify from "rollup-plugin-uglify-es";
import path from "path";

const config = [
    {
        input: "./src/index.ts",
        // transpiled typescript in umd and es format
        output: [
            { file: "dist/maxrects-packer.js", name: "MaxRectsPacker", format: "umd", sourcemap: true },
            { file: "dist/maxrects-packer.mjs", format: "es", sourcemap: true }
        ],
        plugins: [ ts({
            'tsconfig': (resolvedConfig) => {
                const config = Object.assign({}, resolvedConfig);
                config.declarationDir = path.join(__dirname, 'dist');
                return config;
            }
        })]
    },
    {
        input: "./src/index.ts",
        // uglified transpiled typescript in commonjs
        output: [
            { file: "dist/maxrects-packer.min.js", format: "cjs", sourcemap: false }
        ],
        plugins: [ uglify(), ts() ]
    }
];
export default config;
