# Compatibility

The published package has to keep working for everyone already depending on it, so these decisions are
constraints rather than preferences.

## Output

- **ES5**, produced by `tsc` through rollup + `@rollup/plugin-typescript` (`target: es5` in
  `tsconfig.build.json`). This is the only reason the build still uses the TypeScript compiler API:
  esbuild refuses to transform to ES5 at all (`Transforming const to the configured target environment
  ("es5") is not supported yet`). Drop the ES5 target and the build could move to esbuild/rolldown.
- **ES5 covers syntax only — the bundle must not call a runtime API newer than ES5 either.** `target:
  es5` downlevels syntax and polyfills nothing, so `Array.prototype.find` (ES2015),
  `Object.getOwnPropertyDescriptors` (ES2017) or `Reflect.ownKeys` (ES2015) would ship as written and
  throw on an ES5 engine. Use the ES5 primitive instead (`Object.getOwnPropertyNames` plus
  `Object.getOwnPropertyDescriptor`, an index loop for `find`), or guard the call with a
  `typeof … === "function"` feature check the way `Object.getOwnPropertySymbols` is guarded in
  `src/geom/Rectangle.ts`. `scripts/verify-es5.mjs` runs from `postbuild` and fails the build when a
  bundle contains one of these calls, because the specs run `src/` and would never see it.
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
yet. Tests are unaffected: vitest transforms TypeScript through Vite's pipeline — Oxc since Vite 8, with
esbuild no longer in the tree — and never touches the compiler API.
When touching `tsconfig`: TS 7 removed `baseUrl`, `moduleResolution: node10` and `target: es5`, which is
why the type-checking config stays clean while `target: es5` lives in the build config with
`ignoreDeprecations: "6.0"` for TS 6.

## Entry points and declarations

`package.json` is `"type": "module"`, so a `.js` file in the package is ESM to Node — which is why
`main` points at `dist/maxrects-packer.cjs`. (It pointed at the UMD `.js` historically, and `require()`
returned an empty object for three and a half years.)

Three gates protect the entry points: `postbuild` runs `scripts/fix-declaration-extensions.mjs`,
`scripts/build-cjs-declarations.mjs` and `scripts/verify-entry.mjs`, and CI runs
`npm run verify:package`, which packs a real tarball, installs it into a temp consumer and consumes it
**by package name** under `require`, `import`, and two type fixtures — an ESM one under `bundler`,
`node16` and `nodenext`, and a CommonJS `.cts` one under `node16` and `nodenext`.

An `exports` map gives each condition its own runtime file and its own declarations: `import` pairs
`dist/maxrects-packer.mjs` with the ESM `dist/index.d.ts` barrel, `require` pairs
`dist/maxrects-packer.cjs` with the CommonJS `dist/index.d.cts` set that
`scripts/build-cjs-declarations.mjs` writes from `postbuild`. The `.cts` fixture is what gates that
second pair — a `.cts` file is CommonJS to TypeScript whatever the consumer's `type`, so it resolves
through the `require` condition, which is the shape that used to fail with TS1479 (`import … from`) and
TS1471 (`import … = require(…)`) under `node16` while every other check stayed green. Both compilers
agree on that measurement: TypeScript 6.0.3 and 7.0.2. `nodenext` accepted the ESM declaration for that
consumer before the change, so it is the mode that catches a require-branch regression rather than the
one that reproduced the bug. The map is exhaustive, so deep imports
(`maxrects-packer/dist/...`, `maxrects-packer/src/...`) now fail with
`ERR_PACKAGE_PATH_NOT_EXPORTED`; the gate pins that too. [Troubleshooting](../user/troubleshooting.md#a-deep-import-fails-with-err-package-path-not-exported)
covers the consumer-facing side.

- `types` names the **barrel's** declaration (`dist/index.d.ts`). Naming a module's declaration instead
  left six of the eleven documented exports unimportable from TypeScript.
- The emitted declarations carry explicit `.js` extensions, written by
  `scripts/fix-declaration-extensions.mjs`. Without them a `node16`/`nodenext` consumer with
  `skipLibCheck: false` fails inside this package's own `.d.ts` files with TS2834/TS2835. `bundler` and
  the historical `node10` never needed them and are unaffected by them. The `.d.cts` copies get the
  matching `.cjs` extensions instead, so the require branch resolves inside its own set.
- `main`, `module` and `types` stay in place: `exports` wins for any resolver that understands it, and
  those fields keep node10 and bundler-style resolvers working.

## What ships

The `files` allowlist decides: `dist`, `src`, `assets/favicon.ico`, `CHANGELOG.md`, `tsconfig*.json`
and `typedoc.json` — currently 35 files, the seven `.d.cts` copies of the declarations included. `docs/`, the documentation
site and internal plans are not in it and never ship.

## Node version

The development toolchain needs Node `^20.19.0 || >= 22.12.0` (the range `oxlint`/`oxfmt` declare) and
CI covers 20, 22 and 24. The published bundle itself has no engine requirement beyond ES5.