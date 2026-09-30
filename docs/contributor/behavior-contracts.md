# Behaviour contracts

These are the promises the library makes to the software built on it. Each one is pinned by a spec in
`test/`, and breaking one is a breaking change — the [troubleshooting](../user/troubleshooting.md) page
is mostly these contracts seen from the outside.

## 1. `add()` works in place {#add-works-in-place}

`add()`/`addArray()` write `x`, `y`, `rot` and `oversized` directly onto the object handed to them and
return that same object (only the `add(width, height, data)` overload constructs an internal
`Rectangle`). Nothing is copied, so the object you keep a reference to is the object in the bin.

## 2. Tag grouping {#tag-grouping}

With `exclusiveTag: true` (the default) a tagged rect may only enter a bin with the same tag, and a bin
without a tag refuses tagged rects. The check lives in `MaxRectsBin.place()`, which every path reaches —
`MaxRectsBin.add()` deliberately does not pre-check, so a refused rect is simply the `undefined`
`place()` returns.

`exclusiveTag: false` takes the grouping path in `addArray()` instead: a candidate bin is probed **by
copying it**, and a bin whose `clone()` throws counts as one the group does not fit. That way a single
uncopyable bin cannot fail the whole `addArray()` call.

## 3. `next()` only affects what comes after {#next-only-affects-what-comes-after}

It sets the current bin index to `bins.length` and returns that index: earlier bins stop accepting new
rects and every later lookup starts at that index. It creates nothing.

## 4. Dirty propagation {#dirty-propagation}

Mutating a `Rectangle` property increments its `_dirty` counter; a bin is dirty when its own counter
moved or any of its rects is dirty; `repack(quick = true)` only re-packs dirty bins. This is what makes
incremental repacking possible — a change to setter semantics breaks it.

## 5. `save()`/`load()` store free space only {#save-load-store-free-space-only}

Bins produced by `save()` always carry an empty `rects` array: dimensions, options, tag and free
rectangles, nothing else. `load()` restores exactly that. Placed rects have to be re-added by the
caller — the tests lock this in, and it is not a bug to be "helpfully" fixed.

## 6. Size accounting {#size-accounting}

The initial free rectangle is `maxWidth + padding - border * 2`; a placement probe uses
`rect.width + padding`; inside `updateBinSize()` power-of-two and square rounding are applied *before*
the result is validated against `maxWidth`/`maxHeight`, and growth is abandoned when that check fails.

A bin never holds a rect it cannot contain: `place()` refuses a placement when the bin cannot grow to
the node it picked (possible when a `square` cap is below `maxHeight`), and `MaxRectsPacker.add()` then
puts that rect in an `OversizedElementBin` rather than dropping it. The other half of the rule: a
rotated rect reports the footprint it occupies, so `place()` swaps width/height itself for objects
whose `rot` has no setter.

## 7. Generics survive {#generics-survive}

`MaxRectsPacker<T extends IRectangle>` and `MaxRectsBin<T>` accept instances of custom classes and
preserve their extra properties as they are — a rect is never converted to a `Rectangle` behind your
back.

## 8. `clone()` isolates the two bins {#clone-isolates-the-two-bins}

Both bin implementations copy their rects (`Rectangle.Clone`), so a custom class keeps its prototype
and its extra fields, and carry over `tag` and `data`. Mutating a rect one bin holds, or adding to one
bin, never reaches the other. The copy is **shallow**: the object in `rect.data` is shared.

The copy is produced by re-packing the rect copies, which reproduced the source's placements in every
fixture measured (a rotated fixture plus a sweep of 80 seeded bins) — that is a measurement, not a
guarantee. The replay scores each copy afresh, and a placed rect arrives with its footprint already
swapped when `rot` is true, so a bin holding rotated rects can come back with different placements, or
refuse to build at all; the reproducers and a measured fix direction are in the deferred-work ledger
(`docs/plans/deferred-work.md`, tracked but not part of this site). That replay runs with the tag gate
**off** and restores the source's `options`/`tag`/`data` afterwards: a bin can hold rects its own gate
would now refuse — it was tagged after it was filled, or it carries several tags in non-exclusive mode
— and re-running the gate would give back a copy with fewer rects than the original.

### State travels, behaviour does not {#state-travels-behaviour-does-not}

`Rectangle.Clone` copies *own property descriptors* rather than assigned values, so a rect that keeps
extra fields, or the backing fields behind `width`/`height`, non-enumerable, still arrives intact.

When the class has its own `clone()`, that method decides how the copy is *built* and the rule for the
rest is about what the copy already holds:

- what the copy defines itself wins where it is **not a plain value** — an accessor (how a class keeps
  its own state, `#private` fields included), a function (behaviour bound to the copy), a
  non-configurable property (which cannot be redefined at all);
- plain values, and every key the copy does not define, come from the source — so a `clone()` that
  rebuilds only the dimensions still inherits the payload, the placement, the per-item rotation
  permission and any plain field added since construction;
- **no own function and no own accessor is taken from the source.** A `this`-based method and one
  closing over the source have the same shape from outside the class, and a source-text check over six
  review rounds got both directions wrong, so the library stopped guessing: prototype methods come with
  the instance a `clone()` returns, and an own method or accessor the copies need is that `clone()`'s to
  define.

When there is no `clone()`, the copy is a prototype-only shell and takes over every own descriptor
as-is, functions included. Two shapes are **not** covered, and both are documented rather than
detected: a rect that keeps its state in an own accessor closing over the source and provides no
`clone()` stays shared with its copy, and a rect whose state is out of reach entirely (an ECMAScript
`#private` field behind `width`, `height`, `x`, `y`, `rot` or `data`) fails loudly —
`Rectangle.Clone` reports what to add, as does `MaxRectsBin.clone()` for a bin holding a rect it can no
longer place.