# Upgrading to 3.0

3.0.0 is a major release. It repairs the entry points 2.7.4 broke and changes four things a 2.x
consumer can notice. Most projects only need the first section.

If you are on 2.7.4, upgrade for that reason alone: its `main` pointed at an ES module, so
`require("maxrects-packer")` returned an empty object. 2.7.3 and 3.0.0 both work.

## 1. The package resolves per format, and deep imports are sealed

`package.json` gained an `exports` map, and a map is exhaustive: only `.` and `./package.json` resolve.
Import the package by name — the condition decides the file:

```js
import { MaxRectsPacker } from "maxrects-packer";        // dist/maxrects-packer.mjs + ESM declarations
const { MaxRectsPacker } = require("maxrects-packer");   // dist/maxrects-packer.cjs + .d.cts declarations
```

- Deep imports (`maxrects-packer/dist/…`, `maxrects-packer/src/…`) now fail with
  `ERR_PACKAGE_PATH_NOT_EXPORTED` in Node and TS2307 in TypeScript. See
  [troubleshooting](./troubleshooting.md#a-deep-import-fails-with-err-package-path-not-exported).
- A process that both `require`s and `import`s the package now holds **two module instances** — two
  `Rectangle` classes, two `MaxRectsPacker` classes — because the two conditions load different files.
  Compare instances by shape rather than `instanceof`.

## 2. `bin.rects[i]` is `IRectangleInput` unless you name the type

`add()` and `addArray()` accept any object with `width` and `height`, and the generics now default to
`IRectangleInput` rather than `Rectangle`. That is what lets the plain objects the guides use compile
with no type argument.

The outgoing type moved with the input type: `bins[i].rects[i]` is `IRectangleInput`, so assigning it
to a `Rectangle` stops compiling, and its extra members read as `any` through the index signature
instead of as `Rectangle` members. Name the class to get it back:

```ts
import { MaxRectsPacker, Rectangle } from "maxrects-packer";

const packer = new MaxRectsPacker<Rectangle>(1024, 1024, 2);
const rect: Rectangle = packer.bins[0].rects[0]; // collide(), contain(), area — all typed again
```

Nothing changes at runtime: the placed object is still the very object you passed in.

## 3. A non-exclusive bin is no longer labelled automatically

`add()` used to copy the first rect's tag onto a new non-exclusive bin, and `save()` emitted that
label. Both paths now leave the bin unlabelled. Read the rect tags, or assign `bin.tag` explicitly —
the details, including what a full `repack(false)` does to a label you assign, are in
[Rotation and tags](./rotation-and-tags.md#migrating-non-exclusive-bin-labels-in-3-0-0).

## 4. Caller data and saved state are preserved instead of normalized

Three behaviours a 2.x consumer may have leaned on:

- **`addArray()` no longer reorders the array you pass.** Sorting and tag grouping happen on a copy,
  so the array keeps the order you gave it (and a `readonly` array is accepted). Read `bin.rects` for
  the packed order instead of the array you handed in.
- **An explicit `null` payload stays `null`.** Only omitting the argument gives the `{}` placeholder;
  `add(width, height, null)` and `rect.data = null` keep the `null`, so an unguarded `rect.data.foo`
  read needs a guard.
- **A saved `options` object is a copy**, not the live bin's object. Mutating a `save()` result no
  longer changes the bin it came from. The copy is shallow — nested values are shared.

<!-- docs-example: upgrading-to-3 -->
```js
import { MaxRectsPacker } from "maxrects-packer";

// What 3.0.0 pinned down, and what this example gates: a plain object is accepted, the caller's array
// keeps its order, and the placement is written back onto the very object that was passed in.
const packer = new MaxRectsPacker(1024, 1024, 2);
const input = [{ width: 600, height: 20, name: "tree" }];
packer.addArray(input);

const placed = packer.bins[0].rects[0];
if (placed !== input[0]) throw new Error("the packer stopped writing back onto the caller's object");
if (placed.name !== "tree" || placed.x < 0 || placed.y < 0) throw new Error("the placement did not survive");
```

## Not breaking, but different in 3.0.0

- `Rectangle.toJSON()` now serializes the public shape — `width`, `height`, `x`, `y`, `rot`, plus
  `oversized`, `allowRotation` and `data` when they carry something, and any extra enumerable field.
  `JSON.stringify(rect)` no longer emits the private backing fields, and the result can be fed back to
  `addArray()`.
- A `padding` that is not a finite number is rejected by the constructor that received it instead of
  driving `place()` into an unbounded retry loop.
- `clone()` replays a rotated rect in the orientation the caller handed it over in, an oversized
  placeholder keeps its saved state across `load()`, and a custom `clone()` keeps the properties it
  defines.

## If something still breaks

- [Troubleshooting](./troubleshooting.md) — deep imports, `load()`, clone sharing, oversized rects.
- [Persistence](./persistence.md) — what `save()` and `load()` store, and what they never did.
- [Behaviour contracts](../contributor/behavior-contracts.md) — the invariants behind all of the above.
