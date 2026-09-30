# Persistence

Packing a large atlas is expensive; adding a few more sprites later should not mean re-packing
everything. `save()` and `load()` carry the **free space** of the bins across such a break.

```js
import { writeFileSync, readFileSync } from "node:fs";

// after a first pack
const bins = packer.save();
writeFileSync("atlas.json", JSON.stringify(bins));

// later, in another run
const packer = new MaxRectsPacker(1024, 1024, 2);
packer.load(JSON.parse(readFileSync("atlas.json", "utf8")));
packer.addArray([{ width: 300, height: 120 }]);   // lands in the space that was left free
```

## What is stored

Each entry of the array `save()` returns describes one bin: its `width`, `height`, `options`, `tag` and
`freeRects` — the maximal free rectangles the packer would place into next.

**`rects` is always empty in a saved bin.** Already-placed rects are not serialized, and `load()` does
not bring them back: it restores the free space, so whatever you add next avoids the area the earlier
pack used without overlapping it. If you need the placements as well, store your own input list
alongside the saved bins — the rects you passed to `addArray()` carry their `x`/`y`/`rot` after packing,
so they serialize fine:

```js
writeFileSync("state.json", JSON.stringify({ bins: packer.save(), rects: packer.rects }));
```

`load()` writes the loaded bins over the packer's by index and does **not** clear the ones after them:
a packer holding three bins that loads one still has three — the first replaced, the other two keeping
the rects they already held. Load into a fresh packer, or `reset()` first, when you want the loaded
state alone. The rect objects themselves are untouched either way. Loading also restores each bin's
options and tag, so a bin keeps gating the way it did when it was saved.

One kind of entry does not follow that rule. A saved bin whose `maxWidth` or `maxHeight` is larger than
the packer's own size describes a bin this packer could not hold at all, so instead of restoring it at
its index, `load()` **appends** a placeholder
[`OversizedElementBin`](../api/classes/OversizedElementBin.md) of the saved `width` × `height`, holding a
fresh rect, to the end of the bins — next to whatever the packer already held, which is left untouched.
That placeholder carries none of the saved bin's `options` or `tag`, so the gating sentence above does
not apply to it, and because it is appended rather than placed at its index, a later entry of the same
array can take that position and replace it. The measurement is in the deferred-work ledger
(`docs/plans/deferred-work.md`, tracked but not part of this site).

Both methods are plain data in and out — no files, no JSON parsing inside the library, so the
serialized form is yours to compress, version or store in a database.