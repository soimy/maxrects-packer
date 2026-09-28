# Deferred work

Work that was found and deliberately **not** done yet, so the findings survive instead of living only
in review comments. Each item is a decision with its own PR — nothing here is a mechanical fix.

**This file sits at the repository root only temporarily.** It belongs in `docs/plans/` once the `docs/`
tree is adjusted; the reason it cannot move yet is the last section below.

## Code changes (found while closing the test-coverage gaps, PR #73)

Four code paths have no test coverage because they are unreachable, redundant, or outside the declared
API, plus one behaviour question the review raised. The measurements come from the coverage report and
from deleting the code in question and re-running the suite.

- **`MaxRectsBin.add()`'s two tag guards are redundant with `place()`'s** (`src/maxrects-bin.ts:61-62`).
  Deleting *either* one alone keeps every test green: `place()` rejects the same rect and the caller
  sees the same `undefined` either way, so the guards only save constructing a throwaway `Rectangle`.
  Either delete them, or make them do something observable. Invariant 2 in `AGENTS.md` should also stop
  implying the `add()` and `place()` checks are complementary halves — they are defence in depth, and
  only `place()`'s is load-bearing.
- **`splitNode()` re-tests what `collide()` already decided** (`src/maxrects-bin.ts:290` and `:309`).
  Line 287 returns unless `freeRect.collide(usedNode)`, and `Rectangle.collide` *is* those two overlap
  tests, so both conditions can only ever be true (measured 107058 true / 0 false). The bodies are
  live; only the two `if` conditions are dead, so this is a behaviour-preserving simplification.
- **`bin.tag = tag` in `addArray()` can never run** (`src/maxrects-packer.ts:190`). The enclosing block
  is only entered when `options.tag && !options.exclusiveTag` (line 120), yet this condition also
  requires `exclusiveTag`, so it is always false — and the `tag` computed just above it (line 189) is
  never read. Consequence: a bin created by `addArray()` in non-exclusive mode never carries a tag,
  which is what the existing spec asserts (`expect(packer.bins[0].tag).toBeUndefined()` — that spec
  goes through `addArray()`). Bins created by `add()` are unaffected: lines 78 and 99 tag them whenever
  `options.tag` is set, `exclusiveTag` or not, and a later `addArray()` will happily place
  differently-tagged rects into such a tagged bin. Decide whether that difference between the two paths
  is intended: the dead line looks like a feature that was never wired up, not merely cruft.
- **`OversizedElementBin`'s two-argument fallback is unreachable through the declared API**
  (`src/oversized-element-bin.ts:30`). `args.length > 2 ? args[2] : null` needs a two-argument
  construction, but the declared overload is `(width, height, data)`. Either widen the overload or drop
  the fallback.
- **Both `clone()` implementations hand out the same rect objects** (`src/oversized-element-bin.ts:52`
  and `src/maxrects-bin.ts:124`). Measured on both classes: `clone.rects[0].width = 100` changes the
  original's rect as well, so mutating a clone silently mutates the source bin. `clone()` reads like a
  copy operation, which is what makes this surprising. Either document the sharing as intended or copy
  the rects — but only `OversizedElementBin` has a spec pinning the identity
  (`expect(clone.rects[0]).toBe(bin.rects[0])`); `MaxRectsBin` has no clone spec at all, so a change
  there would be caught by nothing.

## Rotation of plain `{width, height}` rects (found by the efficiency gate, separate PR)

`test/efficiency.spec.js` asserts that no candidate reports an efficiency above 1, and exactly one has
to be exempted from it: `1024x2048:1:Rot`, the only rotating candidate whose maxWidth differs from its
maxHeight. It exceeds 1 in 9 of the 41 scenarios under MAX_EDGE and 10 under MAX_AREA, up to `Infinity`;
the two square rotating candidates never do, which is why the exemption is a per-candidate flag rather
than "every rotating candidate".

Measured on `scenarios[5]` (64 rects) with the `1024x2048:1:Rot` candidate (smart + pot + square +
allowRotation, MAX_EDGE): rect area 5,577,552 against bin area 5,242,880, i.e. **1.06**, and the worst
bin reports `1024x1024` while its 13 rects reach **2048** in one axis — 1009x2048 if `rot` is taken to
swap the dimensions, 2048x1841 if it is not. Either way the bin's reported size does not contain what
the bin holds, which is worse than the efficiency number alone suggests.

The rects come from `test/scenarios.json`, so they are plain `{width, height}` objects: none of them
carries an own `_allowRotation`, so `MaxRectsBin.place()` takes `allowRotation` from the packer option
(`src/maxrects-bin.ts:140-144`), `findNode()` returns a node with `rot: true`, and `place()` then writes
`rect.rot = true` without swapping the dimensions (`src/maxrects-bin.ts:163-164`) — plain objects have
no `rot` setter to do it for them. `updateBinSize()` goes on to size the bin from dimensions that no
longer match the footprint actually occupied. This is the same root cause as the per-rect
`allowRotation` pitfall in `AGENTS.md`, with a consequence that entry does not mention.

Decide between swapping the dimensions for objects that lack the setter and refusing rotation for them;
either way it is a behaviour change that needs its own PR.

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
