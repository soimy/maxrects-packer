# Persistence

Packing a large atlas is expensive; adding a few more sprites later should not mean re-packing
everything. `save()` and `load()` carry the **free space** of the bins across such a break.

<!-- docs-example: persistence -->
```js
import { readFileSync, writeFileSync } from "node:fs";
import { MaxRectsPacker } from "maxrects-packer";

// first run: pack something, then keep the free space that is left
const packer = new MaxRectsPacker(1024, 1024, 2);
packer.addArray([{ width: 600, height: 600 }]);
writeFileSync("atlas.json", JSON.stringify(packer.save()));

// later run: start empty, restore that free space, and add only the rects that are new
const next = new MaxRectsPacker(1024, 1024, 2);
next.load(JSON.parse(readFileSync("atlas.json", "utf8")));
next.addArray([{ width: 300, height: 120 }]);   // lands in the space that was left free
```

## What is stored

Each entry of the array `save()` returns describes one bin: its `width`, `height`, `options`, `tag` and
`freeRects` — the maximal free rectangles the packer would place into next.

`tag` is optional. Non-exclusive bins receive no automatic label, so that field is absent unless you
set it explicitly or loaded an existing label. Older non-exclusive snapshots keep their saved labels;
see the [3.0.0 migration note](./rotation-and-tags.md#migrating-non-exclusive-bin-labels-in-3-0-0).
Explicit empty-string labels also round-trip; an absent or `undefined` tag remains absent. JavaScript
callers' other explicit falsy labels are preserved too, without changing how tag grouping reads them.
In exclusive mode, a falsy bin label compares as untagged, just like a falsy rect tag, so an untagged
rect can reuse that bin's restored free space. Placement leaves the stored label unchanged.

The snapshot owns its options object and free-rectangle records: editing a saved option does not
change the live bin, and later live option changes do not update the snapshot. Options are copied
shallowly, so nested extension values remain shared. Arbitrary `bin.data` and custom bin fields are
not stored; bins have a [library-managed lifetime](./repacking.md#bin-metadata-lifetime).
From 3.0.0, consumers that previously changed active configuration through saved options must update
`bin.options` directly instead.

**`rects` is always empty in a saved bin.** Already-placed rects are not serialized, and `load()` does
not bring them back. Calling `save()` leaves the original rects, their tags and their data payloads
untouched; that user data is simply outside the free-space snapshot. Loading restores the free space,
so whatever you add next avoids the area the earlier
pack used without overlapping it. If you need the placements as well, store your own input list
alongside the saved bins — the rects you passed to `addArray()` carry their `x`/`y`/`rot` after packing,
so they serialize fine:

```js
writeFileSync("state.json", JSON.stringify({ bins: packer.save(), rects: packer.rects }));
```

A `Rectangle` serializes to the same public shape as the plain `{ width, height }` object the packer
accepts, so both kinds of rect go into that file unchanged: `width`, `height`, `x`, `y` and `rot`, plus
`oversized` when it is set, `allowRotation` when the rect carries an override, `data` unless it is
still the untouched `{}` the constructor installs, and any custom field you added. The internal backing fields are
not written, and neither is the dirty counter — `JSON.stringify(new Rectangle(10, 20))` is
`{"width":10,"height":20,"x":0,"y":0,"rot":false}`. That output is valid input again: `toJSON()` is typed
`IRectangleJSON`, which satisfies `IRectangleInput`, so a rect round-trips through `addArray()`.

`load()` writes the loaded bins over the packer's by index and does **not** clear the ones after them:
a packer holding three bins that loads one still has three — the first replaced, the other two keeping
the rects they already held. Load into a fresh packer, or `reset()` first, when you want the loaded
state alone. The rect objects themselves are untouched either way. Loading also restores each bin's
options and tag, so a bin keeps gating the way it did when it was saved.

One kind of entry cannot come back as a normal bin: a saved bin whose `maxWidth` or `maxHeight` is
larger than the packer's own size describes a bin this packer could not hold at all. `load()` restores
it as a placeholder [`OversizedElementBin`](../api/classes/OversizedElementBin.md) of the saved
`width` × `height`, holding a fresh rect — at its own index like every other entry, replacing whatever
the packer held there, and carrying the saved `options`, `tag`, `maxWidth`/`maxHeight` and free space.
A snapshot that has to pass through a packer too small for it therefore comes back whole: load it into
a packer that can hold the original limits and the free space it saved is there again.

Cloning that placeholder also preserves its saved dimensions, maxima, options, tag and free space.
The rect, free rectangles and options are separate copies, while bin `data` and `rect.data` remain
shared payloads. The clone stays a placeholder: `add()` returns `undefined` even when free space is
present. Saving the clone therefore keeps the restored snapshot, without serializing placed rects.

Both methods are plain data in and out — no files, no JSON parsing inside the library, so the
serialized form is yours to compress, version or store in a database.
