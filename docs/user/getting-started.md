# Getting started

## Install

```bash
npm install maxrects-packer --save
```

The published bundle is ES5-compatible, has **zero runtime dependencies**, and works in Node and in
the browser. The development toolchain (building this repository) needs Node `^20.19.0 || >= 22.12.0`.

## A first pack

<!-- docs-example: getting-started -->
```js
import { MaxRectsPacker } from "maxrects-packer";

const packer = new MaxRectsPacker(1024, 1024, 2);
const input = [
    { width: 600, height: 20, name: "tree" },
    { width: 600, height: 20, name: "flower" },
    { width: 1000, height: 1000, name: "background" },
    { width: 1000, height: 1000, name: "overlay" }
];

packer.addArray(input);

for (const bin of packer.bins) {
    console.log(bin.width, bin.height, bin.rects);
}
```

CommonJS works the same way:

```js
const { MaxRectsPacker } = require("maxrects-packer");
```

`addArray()` writes `x`, `y` and `rot` **onto the objects you passed in** — the same objects come back
out of `bin.rects`, carrying their placement. Any object with `width` and `height` is accepted; in
TypeScript that is any class implementing [`IRectangle`](../api/interfaces/IRectangle.md), and extra
properties such as `name` above survive untouched.

## Reading the result

```js
packer.bins.forEach((bin) => {
    console.log(`${bin.width}x${bin.height}`);
    bin.rects.forEach((rect) => console.log(rect.name, rect.x, rect.y, rect.rot));
});
```

- `packer.bins` — the bins the packer opened, each with `width`, `height` and `rects`.
- `bin.rects` — the rects placed in that bin, each with `x`, `y`, `width`, `height`, `rot` and `data`.
- A rect that could not fit any bin is reported in its own bin with `oversized: true` — see
  [oversized rects](./packing.md#oversized-rects).

## Coming from an older version

- **2.0.0** moved the package to TypeScript and to named exports: `require("maxrects-packer")` alone
  gives you the module, so use `require("maxrects-packer").MaxRectsPacker` or `import`.
- **2.1.0** accepts any object with `width`/`height` instead of a fixed `{ width, height, data }`
  shape, and changed the `Rectangle` constructor to `new Rectangle(width, height, x, y, rotated)`.

It is a rewrite of [Multi-Bin-Packer](https://github.com/marekventur/multi-bin-packer) with the same
interface names, so migrating usually means changing the import.
