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

- It is larger than `maxWidth × maxHeight` on its own — that always produces
  [an oversized bin](./packing.md#oversized-rects).
- It only fits rotated, but the packer was built with `allowRotation: false`. Per-rect rotation does
  not override the packer option; see
  [per-rect rotation](./rotation-and-tags.md#per-rect-rotation-is-much-narrower-than-it-looks).
- `square: true` with `maxHeight` above `maxWidth`: the square bin a tall rect would need is wider
  than `maxWidth`, so the bin cannot grow to hold it and the rect is reported oversized.

## Rects touch each other, or the atlas edge

`padding` is the gap between placed rects and `border` is the gap to the bin's edge; both default to
0. They change the usable area (`maxWidth + padding - border * 2` for the initial free rectangle), so a
rect that exactly equals `maxWidth` still fits, while one that equals `maxWidth` with a border of 5
does not.

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

By design: `save()` stores free space only, and `load()` restores free space only, so already-placed
rects have to be re-added by the caller. See [persistence](./persistence.md).

## My clone shares state with the original

`bin.clone()` copies the rects, the tag and the data, and the copy is **shallow**: the object in
`rect.data` is shared between the two bins, and a rect class that keeps its state behind an own
accessor is shared too unless it provides its own `clone()`. State travels into the copy; behaviour
(methods and accessors) does not — a class that wants its own methods on the copies defines them in
`clone()`. The full rule is in the
[behaviour contracts](../contributor/behavior-contracts.md#clone-isolates-the-two-bins).

## Still stuck

Open a [discussion](https://github.com/soimy/maxrects-packer/discussions) with a minimal input array,
the options you used and what you expected — a runnable reproduction beats a description.