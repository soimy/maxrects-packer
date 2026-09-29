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
