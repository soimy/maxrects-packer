# Deferred work

Work that was found and deliberately **not** done yet, so the findings survive instead of living only
in review comments. Each item is a decision with its own PR — nothing here is a mechanical fix.

**This file sits at the repository root only temporarily.** It belongs in `docs/plans/` once the `docs/`
tree is adjusted; the reason it cannot move yet is the last section below.

## Code changes (found while closing the test-coverage gaps, PR #73)

One code path has no test coverage because it aliases instead of copying, plus one behaviour question
the measurements raised while the dead code around it was removed. The measurements come from the
coverage report and from deleting the code in question and re-running the suite.

- **Both `clone()` implementations hand out the same rect objects** (`src/oversized-element-bin.ts:52`
  and `src/maxrects-bin.ts:118`). Measured on both classes: `clone.rects[0].width = 100` changes the
  original's rect as well, so mutating a clone silently mutates the source bin. `clone()` reads like a
  copy operation, which is what makes this surprising. Either document the sharing as intended or copy
  the rects — but only `OversizedElementBin` has a spec pinning the identity
  (`expect(clone.rects[0]).toBe(bin.rects[0])`); `MaxRectsBin` has no clone spec at all, so a change
  there would be caught by nothing.
- **`add()` tags a non-exclusive bin with only the first rect's tag** (`src/maxrects-packer.ts:78`).
  In non-exclusive mode one bin may hold several tag groups — `test/maxrects-packer.spec.js` pins a bin
  whose rects carry `one`, `one`, `two`, `two` — so that tag names just one of them, and `save()`
  serializes it while `load()` restores it. `addArray()` leaves the bins it opens untagged
  (`src/maxrects-packer.ts:203`, where the dead `bin.tag = tag` line used to sit), and the choice made
  when that line was deleted was to keep that difference rather than spread the label. Decide whether
  `bin.tag` should exist outside `exclusiveTag: true` at all: tagging in both paths is a user-visible
  metadata change, tagging in neither drops a field from `save()` output. Neither direction changes a
  packing decision — a bin copies its `options` at construction, so a bin created in non-exclusive
  mode never gates on its own tag, even if `packer.options.exclusiveTag` is flipped later.

## Published declarations need extensions for `node16`/`nodenext` consumers (separate PR)

`package.json` now points `types` at the barrel's declaration, so the documented imports resolve — but
only under a resolution mode that tolerates extensionless relative imports (`bundler`, which is what
Vite and webpack use, and the historical `node10`). A consumer on `moduleResolution: node16` or
`nodenext` with `skipLibCheck: false` still fails on the package's own `.d.ts` files, because
`@rollup/plugin-typescript` emits one declaration per source module and keeps the specifiers
extensionless while the package is `"type": "module"`:

```text
node_modules/maxrects-packer/dist/index.d.ts(1,39): error TS2834: Relative import paths need explicit file
  extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an
  extension to the import path.
node_modules/maxrects-packer/dist/index.d.ts(2,56): error TS2835: … Did you mean './maxrects-packer.mjs'?
```

Measured on the packed tarball: `bundler` passes with and without `skipLibCheck`, `nodenext` passes only
with `skipLibCheck: true`. So the impact is limited to consumers who check library declarations, but the
error is reported against this package. Fixing it means writing `.js`-suffixed specifiers in the emitted
declarations — either the source imports plus a resolver in the rollup config (rollup does not map
`./x.js` to `./x.ts` on its own) or a post-processing step over `dist/*.d.ts`. Replacing the per-module
emit with a bundled declaration (what `rollup-plugin-typescript2` produced before PR #68) would remove
the issue at the same time.

## Documentation structure (planned, separate PR)

The target layout for repository documentation:

| Path | Holds |
| --- | --- |
| `docs/spec/` | Specifications and contracts: data formats, API surfaces, algorithm invariants — anything a change has to conform to |
| `docs/plans/` | Plans and deferred work, including this file |
| `docs/*.md` | Notes that do not fit either category |
| `docs/` (everything else) | The generated typedoc site, written by `npm run doc` |

`AGENTS.md` should carry the convention (and stay free of day-to-day records, pointing here instead).

Three things have to change together, and the first two are traps rather than cosmetics:

- **`.gitignore` currently ignores all of `docs/`** (line 67), so `docs/spec/` and `docs/plans/` would
  be invisible to git. It needs to ignore the generated site only — `docs/*` plus re-includes for
  `*.md`, `docs/spec/` and `docs/plans/`.
- **`npm run doc:clean` is `rimraf docs && mkdir docs`**, which would **delete the tracked
  documentation** along with the generated site. It has to preserve all three tracked categories —
  `docs/spec/`, `docs/plans/` and the root-level `docs/*.md` notes — not just the two directories.
- `npm run doc:publish` uploads the whole `docs/` tree to gh-pages, so `docs/spec` and `docs/plans`
  would be published as plain markdown next to the site — decide whether that is wanted or whether the
  publish step should be narrowed to the generated output.

`npm run doc`, `doc:json` and `doc:serve` keep writing to the `docs/` root and need no change. The
published tarball is unaffected either way: the `files` allowlist in `package.json` does not include
`docs/`, and this file is not in it either.
