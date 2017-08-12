# Max Rects Packer
A max rectangle 2d bin packer for packing glyphs or images into multiple sprite-sheet/atlas.

This is a evolved version of [Multi-Bin-Packer](https://github.com/marekventur/multi-bin-packer) with much effiecent packing algorithm. All interfaces and methods are inherited so no tweaks needed in your current code except module name.

It differs from the long list of similar packages by its packing approach: Instead of creating one output bin with a minimum size this package is trying to create a minimum number of bins under a certain size. This avoids problems with single massive image files that are not browser-friendly. This can be especially useful for WebGL games where the GPU will benefit from spritesheets close to power-of-2 sizes.

## Usage:
```
npm install maxrects-packer --save
```

```javascript
let MaxRectsPacker = require("maxrects-packer");
let packer = new MaxRectsPacker(1024, 1024, 2); // width, height, padding

packer.addArray([
    {width: 600, height: 20, data: {name: "tree", foo: "bar"}},
    {width: 600, height: 20, data: {name: "flower"}},
    {width: 2000, height: 2000, data: {name: "oversized background"}},
    {width: 1000, height: 1000, data: {name: "background"}},
    {width: 1000, height: 1000, data: {name: "overlay"}}
]);

console.log(packer.bins.length); // 3
console.log(packer.bins[0].width, packer.bins[0].height); // 2000 2000
console.log("%j", packer.bins[0].rects); // [{"x":0,"y":0,"width":2000,"height":2000,"data":{"name":"oversized background"},"oversized":true}]
console.log(packer.bins[1].width, packer.bins[1].height); // 1000 1020
console.log("%j", packer.bins[1].rects); // [{"width":1000,"height":1000,"x":0,"y":0,"data":{"name":"background"}},{"width":600,"height":20,"x":0,"y":1000,"data":{"name":"tree","foo":"bar"}}]
console.log(packer.bins[2].width, packer.bins[2].height); // 1000 1020
console.log("%j", packer.bins[2].rects); // [{"width":1000,"height":1000,"x":0,"y":0,"data":{"name":"overlay"}},{"width":600,"height":20,"x":0,"y":1000,"data":{"name":"flower"}}]
```

## Test
```
npm test
```

## API

Note: maxrects-packer requires node >= 4.0.0

#### ```new MaxRectsPacker(maxWidth, maxHeight[, padding])```
Creates a new Packer. maxWidth and maxHeight are passed on to all bins. If ```padding``` is supplied all rects will be kept at least ```padding``` pixels apart.

#### ```packer.add(width, height, data)```
Adds a rect to an existing bin or creates a new one to accomodate it. ```data``` can be anything, it will be stored along with the position data of each rect.

#### ```packer.addArray([{width: width, height: height, data: data}, ...])```
Adds multiple rects. Since the input is automatically sorted before adding this approach usually leads to fewer bins created than separate calls to ```.add()```

#### ```packer.bins```
Array of bins. Every bin has a ```width``` and ```height``` parameter as well as an array ```rects```.

#### ```packer.bins[n].rects```
Array of rects for a specific bin. Every rect has ```x```, ```y```, ```width```, ```height``` and ```data```. In case of an rect exceeding ```maxWidth```/```maxHeight``` there will also be an ```oversized``` flag set to ```true```.

## Support for oversized rectangles
Nornally all bins are of equal size or smaller than ```maxWidth```/```maxHeight```. If a rect is added that individually does not fit into those constraints a special bin will be created. This bin will only contain a single rect with a special "oversized" flag. This can be handled further on in the chain by displaying an error/warning or by simply ignoring it.

## Packing algorithm
Use Max Rectangle Algorithm for packing, same as famous **Texture Packer**
  
### Efficiency

|  #  |   size   |   1024x2048:0   |   1024x2048:1   |   1024x1024:0   |   1024x1024:1   |   2048:2048:1   |
| ---:| ---:     | :---            | :---            | :---            | :---            | :---            |
|   0 |   589824 | 100% (1 bins)   | 100% (1 bins)   | 100% (1 bins)   | 100% (1 bins)   | 100% (1 bins)   |
|   1 |  2359296 | 100% (1 bins)   | 100% (1 bins)   | 100% (1 bins)   | 100% (1 bins)   | 100% (1 bins)   |
|   2 |   128214 | 62.9% (1 bins)  | 62% (1 bins)    | 80.8% (1 bins)  | 79.6% (1 bins)  | 79.6% (1 bins)  |
|   3 |   503000 | 83.8% (1 bins)  | 83.2% (1 bins)  | 50.4% (1 bins)  | 49.9% (1 bins)  | 80.3% (1 bins)  |
|   4 |  1399165 | 87.8% (1 bins)  | 87.3% (1 bins)  | 82.4% (2 bins)  | 81.1% (2 bins)  | 72.2% (1 bins)  |
|   5 |  5577552 | 91% (6 bins)    | 88.9% (6 bins)  | 89.6% (9 bins)  | 88.8% (9 bins)  | 84.3% (2 bins)  |
|   6 |  2511610 | 86.8% (2 bins)  | 86.6% (2 bins)  | 87.8% (3 bins)  | 87.2% (3 bins)  | 80% (1 bins)    |
|   7 | 10002839 | 88.1% (6 bins)  | 88.7% (6 bins)  | 91.9% (13 bins) | 91.7% (13 bins) | 86.8% (3 bins)  |
|   8 |  2784525 | 79% (2 bins)    | 78.4% (2 bins)  | 78.8% (4 bins)  | 80.7% (4 bins)  | 82.6% (1 bins)  |
|   9 | 11119811 | 94.5% (21 bins) | 94.3% (21 bins) | 95% (25 bins)   | 95% (25 bins)   | 79.5% (4 bins)  |
|  10 |  6059771 | 90.9% (4 bins)  | 88.5% (4 bins)  | 93.3% (7 bins)  | 94.9% (7 bins)  | 90.6% (2 bins)  |
|  11 | 24196381 | 93.6% (17 bins) | 93.8% (17 bins) | 96.3% (49 bins) | 96.1% (49 bins) | 93.3% (7 bins)  |
|  12 |   622136 | 95.5% (1 bins)  | 87.8% (1 bins)  | 60.4% (1 bins)  | 60.2% (1 bins)  | 79.4% (1 bins)  |
|  13 |  2500476 | 94.7% (2 bins)  | 93.8% (2 bins)  | 84.4% (3 bins)  | 83.7% (3 bins)  | 60.8% (1 bins)  |
|  14 | 10778955 | 87.7% (8 bins)  | 87.3% (8 bins)  | 93% (19 bins)   | 93.9% (19 bins) | 89.9% (3 bins)  |
|  15 | 43135433 | 96.1% (28 bins) | 95.5% (28 bins) | 97.3% (40 bins) | 97.2% (40 bins) | 92% (19 bins)   |
|  16 |  9468402 | 91.3% (7 bins)  | 92.7% (7 bins)  | 95.4% (12 bins) | 95.4% (12 bins) | 77.7% (3 bins)  |
|  17 | 38086169 | 99% (29 bins)   | 97.3% (29 bins) | 98.9% (48 bins) | 98.6% (47 bins) | 95.9% (12 bins) |
|  18 |    43416 | 100% (1 bins)   | 98.8% (1 bins)  | 100% (1 bins)   | 98.8% (1 bins)  | 98.8% (1 bins)  |
|  19 |   173664 | 64.3% (1 bins)  | 63.7% (1 bins)  | 42.9% (1 bins)  | 42.4% (1 bins)  | 99.4% (1 bins)  |
|  20 |  1174320 | 100% (1 bins)   | 99.8% (1 bins)  | 100% (2 bins)   | 99.9% (2 bins)  | 66.5% (1 bins)  |
|  21 |  4687200 | 100% (4 bins)   | 100% (4 bins)   | 100% (4 bins)   | 100% (4 bins)   | 99.9% (2 bins)  |
|  22 |   978586 | 93.2% (2 bins)  | 92.7% (2 bins)  | 93.2% (2 bins)  | 92.7% (2 bins)  | 76% (1 bins)    |
|  23 |  3910494 | 94.9% (2 bins)  | 94.7% (2 bins)  | 96.8% (2 bins)  | 97.8% (2 bins)  | 90.3% (2 bins)  |
|  24 |  1069994 | 86.4% (2 bins)  | 89.7% (2 bins)  | 86.4% (2 bins)  | 89.7% (2 bins)  | 83.7% (1 bins)  |
|  25 |  4266441 | 86.2% (2 bins)  | 84.6% (2 bins)  | 96.4% (3 bins)  | 96.3% (3 bins)  | 86.3% (2 bins)  |
|  26 |  1089544 | 92.2% (2 bins)  | 91.9% (2 bins)  | 92.2% (2 bins)  | 91.9% (2 bins)  | 84.4% (1 bins)  |
|  27 |  4352286 | 94.1% (2 bins)  | 93.8% (2 bins)  | 93.4% (3 bins)  | 93.4% (3 bins)  | 92% (2 bins)    |
|  28 |  1676183 | 89.2% (2 bins)  | 91.1% (2 bins)  | 88.6% (3 bins)  | 86.9% (3 bins)  | 79.5% (1 bins)  |
|  29 |  6687920 | 93.4% (5 bins)  | 93.4% (5 bins)  | 91% (7 bins)    | 90.9% (7 bins)  | 89% (3 bins)    |
|  30 |   971186 | 94.8% (2 bins)  | 94.4% (2 bins)  | 94.8% (2 bins)  | 94.4% (2 bins)  | 75.5% (1 bins)  |
|  31 |  3873714 | 98% (2 bins)    | 97.8% (2 bins)  | 93.6% (2 bins)  | 95.1% (2 bins)  | 95.5% (2 bins)  |
|  32 |  5869493 | 91.2% (4 bins)  | 89.2% (4 bins)  | 92.9% (7 bins)  | 92.5% (7 bins)  | 88.4% (2 bins)  |
|  33 | 23469088 | 94.4% (32 bins) | 94.3% (32 bins) | 95.6% (36 bins) | 95.7% (36 bins) | 92.5% (7 bins)  |
|  34 |  2193864 | 92.5% (2 bins)  | 90.8% (2 bins)  | 94.7% (3 bins)  | 90.4% (3 bins)  | 81% (1 bins)    |
|  35 |  8756095 | 89.1% (10 bins) | 88.9% (10 bins) | 92.4% (15 bins) | 91% (15 bins)   | 93.9% (3 bins)  |
|  36 |  2829265 | 87.4% (2 bins)  | 89.2% (2 bins)  | 89.2% (4 bins)  | 89.2% (4 bins)  | 89.5% (1 bins)  |
|  37 | 11288114 | 94.7% (35 bins) | 94.4% (35 bins) | 96% (38 bins)   | 95.8% (38 bins) | 90.8% (4 bins)  |
|  38 |  2787992 | 89.3% (2 bins)  | 87.4% (2 bins)  | 91.1% (4 bins)  | 90.6% (4 bins)  | 87.7% (1 bins)  |
|  39 | 11140724 | 87.2% (16 bins) | 87% (16 bins)   | 90.1% (22 bins) | 91% (22 bins)   | 90% (4 bins)    |
|  40 |  3546259 | 90.9% (2 bins)  | 90.5% (2 bins)  | 89% (4 bins)    | 88.5% (4 bins)  | 85.4% (1 bins)  |
|  41 | 14173153 | 93.2% (19 bins) | 93% (19 bins)   | 93.2% (25 bins) | 93.5% (25 bins) | 92.6% (4 bins)  |
| sum |          | 93.3%           | 92.8%           | 94.3%           | 94.3%           | 89.6%           |
