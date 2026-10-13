# Troubleshooting

The sharp edges, collected in one place. Most of them are consequences of deliberate contracts, not
bugs — see the [behaviour contracts](../contributor/behavior-contracts.md) for the reasoning.

## The result changed between runs, versions or option values

Packing is a heuristic, not a solver: `addArray()` sorts, `add()` takes the first bin that fits, and
`findNode()` scores free space greedily. Nothing searches for a global optimum, so neither a minimum
bin count nor a stable placement is guaranteed. Assert invariants in your tests — every rect inside its
bin, no overlaps, nothing dropped — rather than an exact bin count or exact coordinates.

`repack(false)` re-sorts and can rearrange everything, and a `logic` change (`MAX_AREA`, `MAX_EDGE`,
`FILL_WIDTH`) can produce a different bin count on the same input.

## A rect that should fit ends up oversized

- It is larger than `maxWidth × maxHeight` in both orientations — that always produces
  [an oversized bin](./packing.md#oversized-rects). A rect that fits when rotated does not, unless the
  packer has `allowRotation: false`.
- It only fits rotated, but the packer was built with `allowRotation: false`. A per-rect flag on a
  plain object does not override the packer option, and no per-rect flag overrides this check; see
  [per-rect rotation](./rotation-and-tags.md#per-rect-rotation-is-much-narrower-than-it-looks).
- `square: true` with `maxHeight` above `maxWidth`: the square bin a tall rect would need is wider
  than `maxWidth`, so the bin cannot grow to hold it and the rect is reported oversized.

## Rects touch each other, or the atlas edge

`padding` is the gap between placed rects and `border` is the gap to the bin's edge; both default to
0. They change the usable area (`maxWidth + padding - border * 2` for the initial free rectangle), so a
rect that exactly equals `maxWidth` still fits, while one that equals `maxWidth` with a border of 5
does not — and that formula is free space, not capacity: the oversized check compares against
`maxWidth`/`maxHeight` themselves, which neither option changes.

## The constructor rejected my `padding`

Both constructors reject numeric `NaN`, `Infinity` and `-Infinity`. Omitting `padding` or passing
`undefined` uses the default `0`. Other JavaScript values, such as `null`, strings, booleans, arrays
and objects, retain the existing coercion behaviour; they are not converted to numbers up front.
For example, `null` behaves like `0`, while `"2"` concatenates with a rect's width in the placement
probe, so it need not pack the same way as numeric `2`. Use a finite number for predictable spacing.

The easy way in is the argument order — the signature is `(width, height, padding, options)`, so
`new MaxRectsPacker(1024, 1024, { padding: 2 })` puts the options object in the padding slot. Construction
still succeeds, but `add()` refuses the non-finite bin size that object's coercion produces: the packer
reports the rect as [oversized](./packing.md#oversized-rects), and a bin returns `undefined` rather than
retrying forever. Pass the gap as the third argument, for example `new MaxRectsPacker(1024, 1024, 2, {})`.

A rect whose own `width`/`height` is `NaN` is refused rather than being allowed to poison the bin: the
packer reports it as [oversized](./packing.md#oversized-rects), and a bin returns `undefined` from
`add()`. Other non-numbers are *not* rejected — JavaScript coerces them during placement, so `null` is a
rect of width `0`, and that is unchanged by this check.

## Something I added to `bin.rects` disappeared after a repack

`repack()` replays the placements of a bin from the rects it holds, and rects that no longer fit are
returned to the packer or dropped from the bin. Push your rects through `add()`/`addArray()` — or add
them and then set the bin dirty — instead of appending to `bin.rects` behind the packer's back.

## The same rect object appears twice

`add()` works in place: it writes `x`/`y`/`rot` onto the object you gave it and stores that object in
the bin. Adding the same object to two packers (or twice to one) means both bins share it, and the
second placement overwrites the first. Copy first (`{ ...rect }`, or your class's `clone()`) when you
need the same geometry in two places.

## Mutating a rect does not change the packing

Writing to a plain `{ width, height }` object has no setter to notice it. Either use a `Rectangle`
(whose setters mark the rect dirty) or call `bin.setDirty()` after mutating, then
[repack](./repacking.md).

## `load()` did not restore my rects

By design: `save()` stores free space only, and `load()` restores free space only. What matters is what
you add next: **do not add the rects you already packed again.** Their area is already taken out of the
restored free space, so adding them a second time puts a duplicate of them in what is left or opens
another bin for it — measured on a 10×10 bin holding a 6×10 rect, which leaves a 4×10 strip: a new 4×10
rect fills that strip in one bin, while the 6×10 rect added again needs a second bin. Keep the old
placements in your own list — `packer.rects` holds them with their `x`/`y`/`rot` — and add only the rects
that are new. See [persistence](./persistence.md).

## My clone shares state with the original

`bin.clone()` copies the rects and the tag, and both bin types carry the bin's own `data` separately
from the rect's data. The copy is **shallow**: bin `data` and `rect.data` payloads remain shared.
An oversized placeholder also copies its dimensions, maxima, options and restored free rectangles;
changing the copied options or free space leaves the source alone, and `add()` still refuses new rects.
A rect class that keeps its state behind an own accessor is shared too unless it provides its own
`clone()`. State travels into the copy; behaviour
(methods and accessors) does not — a class that wants its own methods on the copies defines them in
`clone()`. The full rule is in the
[behaviour contracts](../contributor/behavior-contracts.md#clone-isolates-the-two-bins).

## A deep import fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`

3.0.0 added an `exports` map, and a map is exhaustive: only the entry points it names resolve. Deep
imports that used to work — `maxrects-packer/dist/maxrects-packer.cjs`,
`maxrects-packer/dist/geom/Rectangle.js`, anything else under `dist/` or `src/` — now fail with
`ERR_PACKAGE_PATH_NOT_EXPORTED` in Node and TypeScript alike. Import the package by name instead:
`import { MaxRectsPacker } from "maxrects-packer"` resolves per format, so `require` gets
`dist/maxrects-packer.cjs` with CommonJS declarations and `import` gets `dist/maxrects-packer.mjs`
with the ESM ones. `maxrects-packer/package.json` stays reachable, because the map names it
explicitly. This is the breaking half of the 3.0.0 change; the other half closed the old gap where a
`.cts` file compiled under `module`/`moduleResolution` `node16` could not import the package at all
(TS1479, or TS1471 for `import pkg = require(...)`) because the only declarations it could resolve
were ESM-flavoured. Per-format declarations fixed that: the `require` condition now hands out the
CommonJS `.d.cts` set.

## Still stuck

Open a [discussion](https://github.com/soimy/maxrects-packer/discussions) with a minimal input array,
the options you used and what you expected — a runnable reproduction beats a description.
