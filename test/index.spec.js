import { describe, expect, test } from "vitest";
import * as publicApi from "../src/index";
import { Bin } from "../src/abstract-bin";
import { Rectangle } from "../src/geom/Rectangle";
import { MaxRectsPacker, PACKING_LOGIC } from "../src/maxrects-packer";
import { MaxRectsBin } from "../src/maxrects-bin";
import { OversizedElementBin } from "../src/oversized-element-bin";

// `src/index.ts` is the entry point consumers import and the one module no other spec loads, so a
// re-export that is renamed or dropped ships without a single test noticing. This list is the
// contract: adding a public value means adding it here in the same commit.
const RUNTIME_EXPORTS = ["Bin", "MaxRectsBin", "MaxRectsPacker", "OversizedElementBin", "PACKING_LOGIC", "Rectangle"];
// The three type-only re-exports leave no binding behind, but esbuild — which is what vitest
// transforms these sources with — cannot tell `export { IRectangle }` from a value re-export and
// keeps it, so the namespace carries them as keys holding `undefined`
// (`npx esbuild --loader=ts --format=esm < src/index.ts` prints all nine names). The bundle that
// actually ships is built by rollup + tsc, which drop them: importing `dist/maxrects-packer.mjs`
// reports the six names above and nothing else.
// Those two `undefined` keys are a transform artifact, not the consumer contract, so they are pinned
// only far enough to keep a typo'd or dropped re-export from hiding among them. What a consumer can
// actually import is checked by `npm run verify:package`, which compiles a fixture against the
// `types` entry in package.json.
const TYPE_ONLY_EXPORTS = ["IBin", "IOption", "IRectangle"];

describe("public API surface", () => {
    const entries = Object.entries(publicApi);
    const withValue = entries
        .filter(([, value]) => value !== undefined)
        .map(([name]) => name)
        .sort();
    const withoutValue = entries
        .filter(([, value]) => value === undefined)
        .map(([name]) => name)
        .sort();

    test("exports exactly the documented runtime values", () => {
        expect(withValue).toEqual(RUNTIME_EXPORTS);
    });

    test("leaves nothing else without a value", () => {
        // Without this, a re-export of a name that does not exist (`export { Rectangl } from …`)
        // would land in `withoutValue` and be invisible to the test above.
        expect(withoutValue).toEqual(TYPE_ONLY_EXPORTS);
    });

    test("re-exports the very bindings its modules declare", () => {
        expect(publicApi.Bin).toBe(Bin);
        expect(publicApi.Rectangle).toBe(Rectangle);
        expect(publicApi.MaxRectsPacker).toBe(MaxRectsPacker);
        expect(publicApi.PACKING_LOGIC).toBe(PACKING_LOGIC);
        expect(publicApi.MaxRectsBin).toBe(MaxRectsBin);
        expect(publicApi.OversizedElementBin).toBe(OversizedElementBin);
    });

    test("keeps the documented PACKING_LOGIC values", () => {
        // `IOption.logic` is typed as this enum and consumers may store the number, so renumbering
        // it is a silent breaking change.
        expect(publicApi.PACKING_LOGIC.MAX_AREA).toBe(0);
        expect(publicApi.PACKING_LOGIC.MAX_EDGE).toBe(1);
        expect(publicApi.PACKING_LOGIC.FILL_WIDTH).toBe(2);
    });
});
