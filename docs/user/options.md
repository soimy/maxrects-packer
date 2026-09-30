# Options

```js
const packer = new MaxRectsPacker(maxWidth, maxHeight, padding = 0, options = {});
```

`maxWidth` and `maxHeight` are the bounds every bin stays inside. `padding` keeps placed rects at
least that many pixels apart, and is added to the footprint of each rect when the packer looks for
free space. `options` is a partial [`IOption`](../api/interfaces/IOption.md):

| Option | Default | Effect |
| --- | --- | --- |
| `smart` | `true` | Grow a bin to the smallest size that still fits, instead of jumping to `maxWidth`/`maxHeight`. |
| `pot` | `true` | Round a grown bin up to the next power of two. |
| `square` | `false` | Keep every bin square. |
| `allowRotation` | `false` | Allow 90° rotation while packing. |
| `tag` | `false` | Group rects by tag — `rect.data.tag`, or a `tag` property on the rect itself — into bins carrying that tag. |
| `exclusiveTag` | `true` | With `tag`, keep one tag per bin. Set it to `false` to let several tags share a bin when they fit. |
| `border` | `0` | Atlas edge spacing: free space is kept `border` pixels away from a bin's edges. |
| `logic` | `MAX_EDGE` | How free space is scored — see [packing logic](#packing-logic). |

Options are copied by the packer and handed to each bin it creates, so a bin keeps the options it was
created with even if you mutate the object you passed in afterwards.

## Packing logic

`options.logic` picks the score `findNode()` uses to choose among the free rectangles a bin keeps:

| Value | Name | Chooses |
| --- | --- | --- |
| `0` | `PACKING_LOGIC.MAX_AREA` | The free space with the smallest loss of area — good for tight, mixed sizes. |
| `1` | `PACKING_LOGIC.MAX_EDGE` | The free space with the smallest loss of either width or height (the default). |
| `2` | `PACKING_LOGIC.FILL_WIDTH` | Fills the current row width-first before starting the next row. |

```js
import { MaxRectsPacker, PACKING_LOGIC } from "maxrects-packer";

const packer = new MaxRectsPacker(1024, 1024, 0, { logic: PACKING_LOGIC.FILL_WIDTH });
```

`FILL_WIDTH` reports a usable `bin.height` only with `{ pot: false, square: false }`, and pairs well
with `allowRotation: true`: the other two settings round the grown bin up, so the height stops
tracking what was actually filled.

## Sizing

With the defaults (`smart: true`, `pot: true`) a bin starts small and grows only as far as the rect
being placed requires, then rounds up to a power of two — so a packer declared as `4096 × 4096` that
only ever sees 100×100 rects produces a 128×128 bin rather than a 4096×4096 one. `square: true`
additionally takes the larger of the two dimensions, and `border` is subtracted from the usable area
on every side.