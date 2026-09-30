# Compatibility

The published package has to keep working for everyone already depending on it, so these decisions are
constraints rather than preferences.

## Output

- **ES5**, produced by `tsc` through rollup + `@rollup/plugin-typescript` (`target: es5` in
  `tsconfig.build.json`). This is the only reason the build still uses the TypeScript compiler API:
  esbuild refuses to transform to ES5 at all (`Transforming const to the configured target environment
  ("es5") is not supported yet`). Drop the ES5 target and the build could move to esbuild/rolldown.
- **Zero runtime dependencies**, in the bundle and in `package.json`.
- No DOM and no Node API — geometry only, so the same bundle runs in the browser.

## TypeScript 6 and 7 side by side

The repository runs two compilers on purpose:

- `typescript` is aliased to `@typescript/typescript6`, which provides the JS compiler API that
  `typedoc` and the rollup plugin consume. `@typescript/typescript6` is a forwarding shim —
  `lib/typescript.js` is the single line `module.exports = require("@typescript/old")` — so
  `require("typescript")` still yields the TS 6 API, and `node_modules/.bin/tsc6` is the explicit way to
  run it.
- `@typescript/native` is native TypeScript 7, and `node_modules/.bin/tsc` points at it. That is what
  `npm run typecheck` runs, and `scripts/typecheck.mjs` asserts the version and the alias before it
  does.

Typedoc only supports the TS 6 API so far, which is why the alias cannot become a real `typescript@7`
yet. Tests are unaffected: vitest transforms TypeScript with esbuild and never touches the compiler API.
When touching `tsconfig`: TS 7 removed `baseUrl`, `moduleResolution: node10` and `target: es5`, which is
why the type-checking config stays clean while `target: es5` lives in the build config with
`ignoreDeprecations: "6.0"` for TS 6.

## Entry points and declarations

`package.json` is `"type": "module"`, so a `.js` file in the package is ESM to Node — which is why
`main` points at `dist/maxrects-packer.cjs`. (It pointed at the UMD `.js` historically, and `require()`
returned an empty object for three and a half years.)

Three gates protect the entry points: `postbuild` runs `scripts/fix-declaration-extensions.mjs` and
`scripts/verify-entry.mjs`, and CI runs `npm run verify:package`, which packs a real tarball, installs
it into a temp consumer and consumes it **by package name** under `require`, `import`, and a type
fixture compiled with `bundler`, `node16` and `nodenext`.

That fixture is an **ESM** consumer, which is what makes `node16` and `nodenext` read it as ESM. A
CommonJS TypeScript consumer is the one shape those two modes reject — TS1479, or TS1471 for
`import … = require(…)` — even though `require("maxrects-packer")` works at runtime.
[Troubleshooting](../user/troubleshooting.md#a-commonjs-typescript-project-cannot-import-the-package)
has the measurements and the workarounds; closing it needs an `exports` map, which is why the
deferred-work ledger holds it for a major release.

- `types` names the **barrel's** declaration (`dist/index.d.ts`). Naming a module's declaration instead
  left six of the nine documented exports unimportable from TypeScript.
- The emitted declarations carry explicit `.js` extensions, written by
  `scripts/fix-declaration-extensions.mjs`. Without them a `node16`/`nodenext` consumer with
  `skipLibCheck: false` fails inside this package's own `.d.ts` files with TS2834/TS2835. `bundler` and
  the historical `node10` never needed them and are unaffected by them.
- There is no `exports` field, so deep imports (`maxrects-packer/dist/...`) keep working. Adding one
  would seal those off, which is why it is reserved for a major release.

## What ships

The `files` allowlist decides: `dist`, `src`, `assets/{custom.css,custom.js,favicon.ico}`,
`CHANGELOG.md`, `tsconfig*.json` and `typedoc.json` — currently 30 files. `docs/`, the documentation
site and internal plans are not in it and never ship.

## Node version

The development toolchain needs Node `^20.19.0 || >= 22.12.0` (the range `oxlint`/`oxfmt` declare) and
CI covers 20, 22 and 24. The published bundle itself has no engine requirement beyond ES5.