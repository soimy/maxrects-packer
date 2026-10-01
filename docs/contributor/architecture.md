# Architecture

Six source modules, one public barrel. Geometry in, geometry out — the library never reads or writes
images or files and depends on no DOM or Node API, which is why it runs in the browser as well.

| File | Responsibility |
| --- | --- |
| `src/index.ts` | The only barrel export. Runtime values: `Rectangle`, `MaxRectsPacker`, `PACKING_LOGIC`, `Bin`, `MaxRectsBin`, `OversizedElementBin`; types: `IRectangle`, `IOption`, `IBin`. The surface is pinned by `test/index.spec.js`, so adding or renaming a public value means updating that list in the same commit. |
| `src/types.ts` | `IOption`, `PACKING_LOGIC`, `EDGE_MAX_VALUE` and `EDGE_MIN_VALUE`. `EDGE_MAX_VALUE` is the default edge size of `MaxRectsBin` and `MaxRectsPacker`; `EDGE_MIN_VALUE` is never used inside the library. Both are re-exported by `src/maxrects-packer.ts` and part of the published `.d.ts` — not dead code. |
| `src/geom/Rectangle.ts` | `IRectangle` and `Rectangle`: `width`/`height`/`x`/`y`/`rot`/`data`/`allowRotation` all go through getters and setters and bump `_dirty`; the `rot` setter swaps width/height, the `data` setter keeps `data.allowRotation` in sync. Also `Rectangle.Clone`, the copy the bins' `clone()` uses. |
| `src/abstract-bin.ts` | `IBin` and the abstract `Bin<T>`: the `dirty` semantics and `setDirty()`. `add`/`reset`/`repack`/`clone` are left to subclasses. |
| `src/maxrects-bin.ts` | The single-bin algorithm: `place → findNode → updateBinSize → splitNode → pruneFreeList`. |
| `src/oversized-element-bin.ts` | The placeholder bin for one oversized element: it sets `rect.oversized = true` and its `add()` always returns `undefined`. |
| `src/maxrects-packer.ts` | Multi-bin scheduling: `add`, `addArray`, `next`, `repack`, `save`, `load`, `sort`, `rects`. |

## Data flow

```text
caller's rects
  → addArray: sort (MAX_EDGE|MAX_AREA, ties by hash; group by tag first in non-exclusive mode)
  → add: out of bounds?  → OversizedElementBin
         otherwise       → first bin from bins[_currentBinIndex..] that fits
  → MaxRectsBin.place: findNode scores free rects by `logic`
                       → updateBinSize grows the bin (pot/square)
                       → splitNode splits the chosen free rect
                       → pruneFreeList drops the pieces that are no longer maximal
  → x/y/rot are written back onto that very rect, which is pushed into bin.rects
```

## The algorithm

A bin keeps a list of maximal free rectangles. Placing a rect means scoring every free rectangle with
`options.logic` (`MAX_AREA`, `MAX_EDGE` or `FILL_WIDTH`), taking the best one, splitting it along the
placed rect into the remaining free pieces, and pruning the pieces contained in another. When no free
rectangle fits, the bin tries to grow, and `place()` gives up — returning `undefined` — when it cannot
grow within `maxWidth`/`maxHeight`.

`place`, `findNode` and `updateBinSize` are coupled: a change to how a score is computed usually has to
be checked against how the bin grows and how the free list is split, which is why they are read
together before editing.

## Where to make a change

| Change | Modules |
| --- | --- |
| Scoring or free-space selection | `findNode`, and the `logic` values in `types.ts` |
| Bin growth, `smart`/`pot`/`square` | `updateBinSize`, `splitNode` |
| Multi-bin scheduling, tags, sorting | `maxrects-packer.ts` |
| Rect state, dirty tracking, cloning | `geom/Rectangle.ts` |
| Public surface | `index.ts` **and** `test/index.spec.js` — the barrel is pinned |

Sizes are accounted for in one place each: the initial free rect is `maxWidth + padding - border * 2`,
a probe uses `rect.width + padding`, and rounding happens before the `maxWidth`/`maxHeight` check in
`updateBinSize`. The [behaviour contracts](./behavior-contracts.md) hold these numbers still.