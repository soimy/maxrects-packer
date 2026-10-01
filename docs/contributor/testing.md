# Testing

```bash
npm test                                 # clean build + the whole suite
npx vitest run test/maxrects-bin.spec.js # one spec, no rebuild needed
npm run cover                            # coverage + the artifact self-check
```

## How the specs are written

- They are **ESM JavaScript** that `import`s the TypeScript sources directly (`../src/…`, no file
  extension) — not the built `dist/`, so a broken build is invisible to them and the artifacts have
  their own gate (`npm run verify:package`).
- `describe`, `test`, `expect` and `beforeEach` come from `vitest` with an explicit import; the suite
  does not use globals.
- Assertions on the caller's behalf have to be inside a helper named in `vitest/expect-expect`'s
  `assertFunctionNames` list (`expect`, `fillWithRandomRects`), because that setting replaces the
  default rather than extending it.

## Baseline and gates

The current baseline is **8 spec files, 126 passing, 2 skipped**, with v8 coverage at **100%** on
statements, branches, functions and lines. Both numbers are gates, not measurements:

- `test/index.spec.js` fails when the barrel's export list, binding identity or `PACKING_LOGIC`
  numbering changes;
- `coverage.thresholds` in `vitest.config.js` (99/98/99/99, deliberately a notch below the measured
  values) fails the run on a coverage drop;
- `scripts/verify-coverage.mjs` fails when `lcov.info` or `coverage-final.json` is missing,
  unparseable or incomplete — vitest exits 0 when the `coverage.reporter` key is wrong, so without that
  check a silently lost artifact would stay green.

Coverage is opt-in: only `npm run cover` collects it, and a plain `npm test` leaves `test/coverage/`
alone. Read the real numbers from a full run, and take the gap list from the JSON/lcov output rather
than from the text table.

The two `test.skip`s are the bulk comparison table in `test/efficiency.spec.js` (`scenarios.json` plus
`ascii-table`); they only run when un-skipped by hand. The rest of that file does assert: every
candidate packs every scenario completely, `combined best of` really picks the better logic under its
lexicographic rule, and no candidate reports an efficiency above 1 or leaves a rect outside the bin it
was put in. Each candidate packs its **own copy** of the fixture, because `addArray()` writes
`x`/`y`/`rot` back onto the rect objects and a rotated rect carries swapped dimensions afterwards.

## What a change needs

- **Every bug fix needs a test that fails before the fix and passes after it.** For a reported bug, add
  an explicit assertion with the reported input instead of hoping a randomized test stumbles onto it.
- **Every behaviour change needs a test too** — a PR that changes packing output without one will be
  asked to add it.
- `test/maxrects-bin.spec.js` holds the randomized "monkey" tests that assert no rect overlaps and none
  exceeds its bin. They are the main regression net for algorithm changes.
- Prefer explicit assertions with fixed input for edge cases; randomness finds the shapes nobody thought
  of, but it cannot pin one.

## CI

`.github/workflows/node.js.yml` runs on Node 20, 22 and 24: `lint` → `format:check` → `typecheck` →
`verify:docs` → `docs:build` → `cover` → `verify:package`. `verify:package` is last on purpose: it
consumes a real packed tarball, so it only means something after a build.