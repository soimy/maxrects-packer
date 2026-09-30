# User guide

`maxrects-packer` packs rectangles into as few bins as possible, each staying inside a maximum
`width × height` — sprite sheets, texture atlases and any other "many small images into few big
images" problem.

It differs from most packing libraries by *what it optimizes*: instead of making one output image of
minimum size, it makes a **minimum number of images under a maximum size**. A single 8192×8192 atlas
is not browser-friendly, while four 1024×1024 sheets usually are.

- [Getting started](./getting-started.md) — install and a runnable example.
- [Options](./options.md) — every constructor argument and option, with defaults.
- [Packing](./packing.md) — adding rects, what a bin holds, oversized rects, packing logic.
- [Rotation and tags](./rotation-and-tags.md) — 90° rotation and tag-based grouping.
- [Repacking](./repacking.md) — the dirty flag and `repack()`.
- [Persistence](./persistence.md) — `save()` and `load()`.
- [Troubleshooting](./troubleshooting.md) — the sharp edges, and what the library does *not* do.

The API reference is generated from the source and its JSDoc: [API](../api/index.md).

Packing is a heuristic, not a solver — see [packing](./packing.md#what-the-algorithm-guarantees) for
what that means in practice.