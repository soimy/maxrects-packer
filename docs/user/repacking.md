# Repacking

After a pack, the free space a bin keeps no longer matches its rects as soon as you change one. The
library tracks that with a dirty flag:

- every write through a `Rectangle`'s `width`, `height`, `x`, `y`, `rot`, `data` or `allowRotation`
  setter bumps that rect's counter;
- a bin is dirty when its own placements changed **or** any rect it holds is dirty;
- `packer.repack(quick)` re-packs.

```js
rect.width = 200;        // the rect is now dirty
packer.repack();         // quick: only the dirty bins are re-packed
```

| Call | Behaviour |
| --- | --- |
| `packer.repack()` | `quick = true`: re-packs only the bins whose `dirty` flag is set, and appends the rects that no longer fit elsewhere. |
| `packer.repack(false)` | Resets the packer and re-adds every rect, re-sorting them first, which can change the bin count and the placements. Slower, usually tighter. It returns immediately when nothing is dirty. |
| `bin.repack()` | Re-packs that one bin: its rects are re-sorted big to small and placed again, and the ones that no longer fit are returned so the caller can put them elsewhere. |

`packer.dirty` is `bins.some(bin => bin.dirty)`, and a bin is dirty when its own placements changed or
any rect it holds is dirty. So resizing a `Rectangle` is enough to make `repack(false)` do work.

`repack()` re-runs the placement from scratch for the affected bins, so `x`/`y` are rewritten — the
rects do not keep the coordinates they had before. Do not hold on to a placement across a repack; read
`rect.x`/`rect.y` after it.

A plain object with `width`/`height` has no setters, so writing to it does not mark anything dirty.
After resizing such a rect, make the bin dirty yourself — `bin.setDirty()` — or the quick repack will
skip it.