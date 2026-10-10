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

`bin.clone()` copies the rects and the tag, and the copy is **shallow**: `MaxRectsBin.clone()` also
carries a `data` set on the bin itself, while an oversized bin re-derives its `data` from its rect.
The object in `rect.data` is shared between the two bins, and a rect class that keeps its state behind an own
accessor is shared too unless it provides its own `clone()`. State travels into the copy; behaviour
(methods and accessors) does not — a class that wants its own methods on the copies defines them in
`clone()`. The full rule is in the
[behaviour contracts](../contributor/behavior-contracts.md#clone-isolates-the-two-bins).

## A CommonJS TypeScript project cannot import the package

The package is `"type": "module"` and carries no `exports` field, so a TypeScript file that compiles to
CommonJS and resolves modules the `node16` or `nodenext` way cannot import it: the compiler reports
**TS1479** — "the referenced file is an ECMAScript module and cannot be imported with `require`" — or
**TS1471** for `import pkg = require("maxrects-packer")`. That is the module format of the
*declarations* being read, not the runtime: a plain JavaScript `require("maxrects-packer")` works, and
the package gate consumes the real tarball that way.

Measured against the published tarball from a CommonJS consumer, `skipLibCheck` either way, with
TypeScript 6.0.3 and 7.0.2 agreeing on the two diagnostics:

| How the consumer imports | `node16` / `nodenext` |
| --- | --- |
| `import { MaxRectsPacker } from "maxrects-packer"` | TS1479 |
| `import pkg = require("maxrects-packer")` | TS1471 |
| `await import("maxrects-packer")` inside an `async` function | compiles |
| `moduleResolution` `bundler` | compiles |
| `moduleResolution` `node10` | TypeScript 6 only: TS5107 without `"ignoreDeprecations": "6.0"`; TypeScript 7 removed the option (TS5108) |

So: use a dynamic `import()`, leave the `require` in JavaScript, or resolve with `bundler`. `node10` is a
TypeScript 6 escape hatch, not a workaround for 7. An
`exports` map with per-format declarations would close the gap, but it seals off deep imports
(`maxrects-packer/dist/...`) as well, which is why it waits for a major release — the deferred-work
ledger (`docs/plans/deferred-work.md`, tracked but not part of this site) records it.

## Still stuck

Open a [discussion](https://github.com/soimy/maxrects-packer/discussions) with a minimal input array,
the options you used and what you expected — a runnable reproduction beats a description.