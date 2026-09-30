# Packing

## Adding rects

```js
packer.add(width, height, data);   // constructs a Rectangle for you
packer.add(rect);                  // any object with width and height
packer.addArray(rects);            // many at once, sorted first
```

`add()` writes the placement onto the object it was given and returns it — it does not copy. The
multi-argument form is the exception: it builds an internal `Rectangle` and returns that.

`addArray()` sorts the input before placing it (`MAX_EDGE` or `MAX_AREA` order, ties broken by the
rects' own optional `hash` property, highest first, when both carry one) and groups rects by tag first when tags are not exclusive, which is why one
`addArray()` call usually produces fewer bins than the same rects added one by one.

## What a bin holds

- `bin.width` / `bin.height` — the size the bin grew to. A normal bin stops at `maxWidth`/`maxHeight`;
  the placeholder bin an oversized rect gets is that rect's own size instead, so it can be larger
  ([below](#oversized-rects)).
- `bin.rects` — the placed rects, each with `x`, `y`, `rot` and whatever data you attached.

A bin never holds a rect it cannot contain: if the bin cannot grow to fit, the rect is not placed
there. `MaxRectsPacker.add()` then falls back to an oversized bin instead of dropping it.

## Oversized rects

A rect that does not fit `maxWidth × maxHeight` in either orientation cannot go into a normal bin, so
it gets a bin of its own:

```js
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