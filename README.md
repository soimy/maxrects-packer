# ![icon](./assets/favicon32.png) Max Rects Packer

[![Node.js CI](https://github.com/soimy/maxrects-packer/actions/workflows/node.js.yml/badge.svg)](https://github.com/soimy/maxrects-packer/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/soimy/maxrects-packer/branch/master/graph/badge.svg)](https://codecov.io/gh/soimy/maxrects-packer)
[![npm version](https://badge.fury.io/js/maxrects-packer.svg)](https://badge.fury.io/js/maxrects-packer)
![npm](https://img.shields.io/npm/dm/maxrects-packer.svg)
![NPM Type Definitions](https://img.shields.io/npm/types/maxrects-packer)

A max rectangle 2D bin packing algorithm for packing glyphs or images into multiple sprite sheets or
atlases. Minimalist, with no runtime dependency.

It differs from most packing libraries by what it optimizes: instead of creating one output image of
minimum size, it creates a **minimum number of images under a maximum size**. That avoids the single
massive image that is not browser-friendly, and suits WebGL games where the GPU benefits from sprite
sheets close to power-of-two sizes.

It is an evolved version of [Multi-Bin-Packer](https://github.com/marekventur/multi-bin-packer) that
keeps the same interfaces and method names, so migrating usually means changing the import.

## Install

```bash
npm install maxrects-packer --save
```

## Usage

<!-- docs-example: readme-usage -->
```js
import { MaxRectsPacker } from "maxrects-packer";

const options = {
    smart: true,          // grow bins to the smallest size that fits
    pot: true,            // round grown bins up to a power of two
    square: false,
    allowRotation: true,
    border: 5
};
const packer = new MaxRectsPacker(1024, 1024, 2, options); // width, height, padding, options

const input = [
    { width: 600, height: 20, name: "tree" },                 // any object with width and height
    { width: 600, height: 20, name: "flower" },
    { width: 2000, height: 2000, name: "oversized background" }, // gets a bin of its own
    { width: 1000, height: 1000, name: "background", color: 0x000000ff },
    { width: 1000, height: 1000, name: "overlay" }
];

packer.addArray(input);        // sorts the input, then packs
packer.next();                 // stop adding to the bins that exist
packer.addArray([{ width: 256, height: 256, name: "late sprite" }]);   // fills bins created from here on

packer.bins.forEach((bin) => console.log(bin.width, bin.height, bin.rects));

const saved = packer.save();   // free space only, for reuse in a later run
const next = new MaxRectsPacker(1024, 1024, 2, options);
next.load(saved);
next.addArray([{ width: 256, height: 256, name: "after the reload" }]);   // only the rects that are new
```

`addArray()` writes `x`, `y` and `rot` onto the objects you pass in, so `bin.rects` holds your objects
with their placement added. Packing is a heuristic — it does not promise the fewest possible bins.

CommonJS works too: `const { MaxRectsPacker } = require("maxrects-packer");`

## Documentation

The full guide, the API reference generated from the source and the contributor documentation live at
**[soimy.github.io/maxrects-packer](https://soimy.github.io/maxrects-packer/)**:

- **User guide** — options, packing, rotation and tags, repacking, persistence and the
  [troubleshooting](https://github.com/soimy/maxrects-packer/blob/master/docs/user/troubleshooting.md)
  page with the sharp edges.
- **API reference** — every exported class, interface and enum, with JSDoc.
- **Contributing** — development setup, testing, architecture, behaviour contracts and compatibility.

Contributors should read [CONTRIBUTING.md](./CONTRIBUTING.md); AI agents should read
[AGENTS.md](./AGENTS.md). Release history is in [CHANGELOG.md](./CHANGELOG.md).

## Development

```bash
npm ci --include=dev   # --include=dev matters when NODE_ENV=production is set
npm test               # clean build + vitest suite
npm run cover          # coverage
npm run docs:build     # this documentation site
```

See [docs/contributor/development.md](./docs/contributor/development.md) for the full script list, the
Toolchain (rollup + TypeScript 6/7 side by side, vitest, oxlint/oxfmt) and the worktree workflow.

## License

MIT
