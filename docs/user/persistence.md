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

`load()` replaces the packer's bins with the loaded ones; anything you packed in the current run is
gone from the packer (the rect objects themselves are untouched). Loading also restores each bin's
options and tag, so a bin keeps gating the way it did when it was saved.

Both methods are plain data in and out — no files, no JSON parsing inside the library, so the
serialized form is yours to compress, version or store in a database.