# Rotation and tags

## 90° rotation

With `allowRotation: true` the packer scores both orientations of a rect and may place it rotated when
that fits better. A rect that ends up rotated carries `rot: true`, and its `width`/`height` describe the
footprint it actually occupies — for a `Rectangle` instance the `rot` setter swaps them, and for a plain
`{ width, height }` object the packer swaps them itself, because such an object has no setter to do it.

Rotating is a decision, not a given: a rect that already fits unrotated is left alone, so `rot` stays
`false` even though the option is on.

<!-- docs-example: rotation -->
```js
import { MaxRectsPacker } from "maxrects-packer";

// The rect only fits the bin rotated: 1000 wide would exceed maxWidth, 300 wide does not.
const packer = new MaxRectsPacker(512, 1024, 0, { allowRotation: true });
const rect = { width: 1000, height: 300 };
packer.addArray([rect]);                          // `addArray()` returns nothing; it fills your objects

console.log(rect.rot, rect.width, rect.height);   // true 300 1000 — the footprint in the bin
```

If you need the original dimensions back, keep them: rotation happens in place, on your object.

### Per-rect rotation is much narrower than it looks

There is no supported way to opt a single rect into rotation against a packer configured with
`allowRotation: false`:

- `MaxRectsBin.place()` honours a per-rect `allowRotation` only when the rect object itself carries an
  own `_allowRotation` property. `Rectangle` instances do — its `data` setter maintains that field —
  while the plain `{ width, height, allowRotation: true }` objects this guide advertises do **not**, so
  the flag has no effect there.
- `MaxRectsPacker.add()` decides whether a rect is oversized from the packer's `allowRotation` alone.
  So a rect that only fits when rotated, in a packer with `allowRotation: false`, is reported
  [oversized](./packing.md#oversized-rects) instead of being rotated into a bin.

Set the option on the packer to rotate, and treat a per-rect flag as unsupported.

## Tag-based grouping

```js
const packer = new MaxRectsPacker(1024, 1024, 0, { tag: true });
packer.addArray([
    { width: 100, height: 100, data: { tag: "hud" } },
    { width: 120, height: 80, data: { tag: "hud" } },
    { width: 200, height: 200, data: { tag: "world" } }
]);
```

The tag is read from `rect.data.tag` — it is part of the rect's data, not a property of the rect
itself. With `tag: true`:

- rects carrying the same tag are packed into the same bin;
- with `exclusiveTag: true` (the default) a tagged rect only enters a bin with the same tag, and a bin
  that has no tag refuses tagged rects, so one tag can never share a bin with another;
- with `exclusiveTag: false` the packer instead tries to fit a tag group into an existing bin
  alongside other groups, and only opens a new bin when none of them has room. That probe copies the
  candidate bin, so it never disturbs the placements you already have.

`bin.tag` records the label of a bin. In non-exclusive mode a bin may legitimately hold several tags,
so the label names one of them rather than describing everything inside — treat it as metadata, not as
a constraint, and read the tags you care about from `bin.rects[i].data.tag`.