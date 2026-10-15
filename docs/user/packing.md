# Packing

## Adding rects

```js
packer.add(width, height, data);   // constructs a Rectangle for you
packer.add(rect);                  // any object with width and height
packer.addArray(rects);            // many at once, sorted first
```

`add()` writes the placement onto the object it was given and returns it — it does not copy. The
multi-argument form is the exception: it builds an internal `Rectangle` and returns that.

`addArray()` sorts a copy before placing it (`MAX_EDGE` or `MAX_AREA` order, ties broken by the
rects' own optional `hash` property, highest first, when both carry one) and groups rects by tag first when tags are not exclusive, which is why one
`addArray()` call usually produces fewer bins than the same rects added one by one.

The caller's array keeps its original order in every mode, including non-exclusive tags. A frozen or
readonly array is accepted; its rect objects must still permit the documented geometry writes.

## Keeping business data

Packing preserves rect identity, custom fields and payload references. The numeric overload stores
the supplied `data` value as-is, including `null` and `undefined`; omitting it keeps the default `{}`.
Assigning `Rectangle.data = null` clears the payload and marks the rect dirty when its value changes.
It does not clear a previously set `allowRotation` override.

Keep durable business data on rects, for example `rect.data = { app: { assetId: "sprite" } }`.
Choose your own namespace; the library adds none. Avoid collisions with rect protocol fields
`width`, `height`, `x`, `y`, `rot`, `oversized`, `data`, `tag`, `hash`, `allowRotation`, `dirty`,
`setDirty` and `clone`, and with `Rectangle`'s internal backing fields. Within `data`, `tag` controls
grouping and `allowRotation` is read by `Rectangle`'s setter; keep unrelated business values elsewhere.
Custom classes remain supported under the [clone contract](../contributor/behavior-contracts.md#clone-isolates-the-two-bins).
A custom field survives `JSON.stringify()` too, so a rect you serialize keeps it
([below](#serializing-a-rect)).

For 3.0.0, stop relying on non-exclusive `addArray()` to reorder your array; read packing order from
`packer.rects` or `bin.rects`. `Rectangle.data = null` now clears the payload rather than doing
nothing, and numeric `add(width, height, null)` keeps `null` rather than substituting `{}`.

## What a bin holds

- `bin.width` / `bin.height` — the size the bin grew to. A normal bin stops at `maxWidth`/`maxHeight`;
  the placeholder bin an oversized rect gets is that rect's own size instead, so it can be larger
  ([below](#oversized-rects)).
- `bin.rects` — the placed rects, each with `x`, `y`, `rot` and whatever data you attached.

Bins are library-owned packing state, not durable business records. Their fields and lifecycle may
be managed by the library; [full repacking](./repacking.md#bin-metadata-lifetime) rebuilds them.
An oversized bin carries its single rect's payload as `bin.data` too, without changing that payload.

A bin never holds a rect it cannot contain: if the bin cannot grow to fit, the rect is not placed
there. `MaxRectsPacker.add()` then falls back to an oversized bin instead of dropping it.

## Oversized rects

A rect that does not fit `maxWidth × maxHeight` in either orientation cannot go into a normal bin, so
it gets a bin of its own:

<!-- docs-example: oversized -->
```js
import { MaxRectsPacker } from "maxrects-packer";

const packer = new MaxRectsPacker(1024, 1024);
packer.add(2000, 2000, { name: "background" });

console.log(packer.bins[0].rects[0].oversized);   // true
```

The same happens to a rect that no bin can be grown to hold — possible when `square: true` and
`maxHeight` is above `maxWidth`, because the square bin a tall rect needs would be wider than
`maxWidth`. Either way the rect is reported rather than silently dropped, so the caller can warn,
skip it, or handle it separately.

## `next()`

```js
packer.addArray(firstBatch);
packer.next();                 // returns the index of the next bin
packer.addArray(secondBatch);  // goes into bins created from here on
```

`next()` stops the packer from adding anything else to the bins that exist, and returns the index the
next bin would get. It does not create or return a bin.

## What the algorithm guarantees

Packing is a **heuristic, not a solver**. `addArray()` sorts, `add()` takes the first bin that fits,
and inside a bin `findNode()` greedily scores the free rectangles by `options.logic`. Nothing searches
for a global optimum, so:

- the number of bins is not guaranteed to be minimal, and a different `logic`, sort order or input
  order can produce a different result;
- a change in this library may claim "fewer bins on these inputs", never "the fewest possible".

The algorithm itself is the MaxRects family used by texture packers: a bin keeps a list of maximal
free rectangles, places into the best-scoring one, splits it, and prunes the ones that are no longer
usable.

## Repacking after a change

If you mutate rects after packing — or push a rect into `bin.rects` yourself — call
[`repack()`](./repacking.md) so the free space matches the rects again.

## Serializing a rect

`JSON.stringify()` on a `Rectangle` writes the public shape, not the class's backing fields, so a
serialized rect looks like the plain object the packer also accepts:

<!-- docs-example: tojson -->
```js
import { MaxRectsPacker, Rectangle } from "maxrects-packer";

const packer = new MaxRectsPacker(64, 64);
packer.add(new Rectangle(8, 8));

console.log(JSON.stringify(packer.rects[0]));
// {"width":8,"height":8,"x":0,"y":0,"rot":false}
```

The keys are `width`, `height`, `x`, `y` and `rot`, plus `oversized` when it is set, `allowRotation`
when the rect carries an override, `data` unless it is still the untouched `{}` the constructor
installs, and any custom field you added — including one whose name starts with an underscore. The internal backing fields and the dirty counter are never written, and every
value comes from the public API — so a subclass that overrides `data` or `allowRotation` serializes what
its callers see. `toJSON()` is typed `IRectangleJSON`, which satisfies `IRectangleInput`, so the output
round-trips: parse it and hand it back to `addArray()`. To persist placements along with the free space,
see [Persistence](./persistence.md).
