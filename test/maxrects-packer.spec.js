import { beforeEach, describe, expect, test } from "vitest";
import { MaxRectsPacker, PACKING_LOGIC } from "../src/maxrects-packer";
import { OversizedElementBin } from "../src/oversized-element-bin";
import { Rectangle } from "../src/geom/Rectangle";

const opt = {
    smart: true,
    pot: false,
    square: false,
    allowRotation: false,
    tag: false,
    exclusiveTag: true
};

let packer;
beforeEach(() => {
    packer = new MaxRectsPacker(1024, 1024, 0, opt);
});

describe("#add", () => {
    test("adds first element correctly", () => {
        packer.add(1000, 1000, { num: 1 });
        expect(packer.bins[0].rects[0].data.num).toBe(1);
    });

    test("creates additional bin if element doesn't fit in existing bin", () => {
        packer.add(1000, 1000, { num: 1 });
        packer.add(1000, 1000, { num: 2 });
        expect(packer.bins.length).toBe(2);
        expect(packer.bins[1].rects[0].data.num).toBe(2);
    });

    test("adds to existing bins if possible", () => {
        packer.add(1000, 1000, { num: 1 });
        packer.add(1000, 1000, { num: 2 });
        packer.add(10, 10, { num: 3 });
        packer.add(10, 10, { num: 4 });
        expect(packer.bins.length).toBe(2);
    });

    test("adds to new bins after next() is called", () => {
        packer.add(1000, 1000, { num: 1 });
        packer.add(1000, 1000, { num: 2 });
        packer.next();
        packer.add(10, 10, { num: 3 });
        packer.add(10, 10, { num: 4 });
        expect(packer.bins.length).toBe(3);
        expect(packer.bins[packer.bins.length - 1].rects.length).toBe(2);
    });

    test("adds to bins with tag matching on", () => {
        packer.options.tag = true;
        packer.add(1000, 1000, { num: 1 });
        packer.add(10, 10, { num: 2 });
        packer.add(1000, 1000, { num: 3, tag: "one" });
        packer.add(1000, 1000, { num: 4, tag: "one" });
        packer.add(10, 10, { num: 5, tag: "one" });
        packer.add(10, 10, { num: 6, tag: "one" });
        packer.add(10, 10, { num: 7, tag: "two" });
        packer.next();
        packer.add(10, 10, { num: 8, tag: "two" });
        expect(packer.bins.length).toBe(5);
        expect(packer.bins[0].rects.length).toBe(2);
        expect(packer.bins[0].tag).toBeUndefined();
        expect(packer.bins[1].rects.length).toBe(3);
        expect(packer.bins[1].tag).toBe("one");
        expect(packer.bins[2].rects.length).toBe(1);
        expect(packer.bins[2].tag).toBe("one");
        expect(packer.bins[packer.bins.length - 1].rects.length).toBe(1);
        expect(packer.bins[packer.bins.length - 1].tag).toBe("two");
    });

    test("adds to bins with tag matching disable", () => {
        packer.options.tag = false;
        packer.add(1000, 1000, { num: 1 });
        packer.add(10, 10, { num: 2 });
        packer.add(1000, 1000, { num: 3, tag: "one" });
        packer.add(10, 10, { num: 4, tag: "two" });
        packer.next();
        packer.add(10, 10, { num: 8, tag: "two" });
        expect(packer.bins.length).toBe(3);
        expect(packer.bins[0].tag).toBeUndefined();
        expect(packer.bins[1].tag).toBeUndefined();
        expect(packer.bins[packer.bins.length - 1].rects.length).toBe(1);
        expect(packer.bins[packer.bins.length - 1].tag).toBeUndefined();
    });

    test("adds to bins with non-exclusive tag matching", () => {
        packer.options = {
            ...packer.options,
            tag: true,
            exclusiveTag: false
        };
        let input = [
            { width: 512, height: 512, data: {} },
            { width: 512, height: 512, data: { tag: "one" } },
            { width: 512, height: 512, data: { tag: "two" } },
            { width: 512, height: 512, data: { tag: "two" } },
            { width: 512, height: 512, data: { tag: "two" } },
            // Will break into its own bin
            { width: 600, height: 600, data: { tag: "two" } },
            { width: 512, height: 512, data: { tag: "two" } },
            { width: 512, height: 512, data: { tag: "one" } },
            { width: 512, height: 512, data: {} }
        ];
        packer.addArray(input);
        expect(packer.bins.length).toBe(3);
        expect(packer.bins[0].tag).toBeUndefined();
        expect(packer.bins[1].tag).toBeUndefined();
        expect(packer.bins[2].tag).toBeUndefined();
        expect(packer.bins[0].rects.length).toBe(4);
        expect(packer.bins[1].rects.length).toBe(4);
        expect(packer.bins[2].rects.length).toBe(1);
        expect(packer.bins[0].rects[0].data.tag).toBe("one");
        expect(packer.bins[0].rects[1].data.tag).toBe("one");
        expect(packer.bins[0].rects[2].data.tag).toBe("two");
        expect(packer.bins[0].rects[3].data.tag).toBe("two");
        expect(packer.bins[1].rects[0].data.tag).toBe("two");
        expect(packer.bins[1].rects[1].data.tag).toBe("two");
        expect(packer.bins[1].rects[2].data.tag).toBeUndefined();
        expect(packer.bins[1].rects[3].data.tag).toBeUndefined();
        expect(packer.bins[2].rects[0].data.tag).toBe("two");
    });

    test("reads a tag from the rect itself, not only from rect.data", () => {
        packer = new MaxRectsPacker(1024, 1024, 0, { ...opt, tag: true, exclusiveTag: false });
        packer.addArray([
            { width: 512, height: 512, tag: "one" },
            { width: 512, height: 512, tag: "one" },
            { width: 512, height: 512 }
        ]);
        expect(packer.bins).toHaveLength(1);
        expect(packer.bins[0].rects).toHaveLength(3);
    });

    test("allows oversized elements to be added", () => {
        packer.add(1000, 1000, { num: 1 });
        packer.add(2000, 2000, { num: 2 });
        expect(packer.bins.length).toBe(2);
        expect(packer.bins[1].rects[0].width).toBe(2000);
        expect(packer.bins[1].rects[0].oversized).toBe(true);
    });

    test("checks oversized elements rotation and adds rotated", () => {
        const packer = new MaxRectsPacker(512, 1024, 0, { ...opt, allowRotation: true });
        packer.add(640, 256, { num: 1 });
        expect(packer.bins.length).toBe(1);
        expect(packer.bins[0].rects[0].width).toBe(256);
        expect(packer.bins[0].rects[0].height).toBe(640);
        expect(packer.bins[0].rects[0].oversized).toBe(false);
    });

    test("checks oversized elements and skip rotation when set to false", () => {
        const packer = new MaxRectsPacker(512, 1024, 0, { ...opt, allowRotation: false });
        packer.add(640, 256, { num: 1 });
        expect(packer.bins.length).toBe(1);
        expect(packer.bins[0].rects[0].width).toBe(640);
        expect(packer.bins[0].rects[0].oversized).toBe(true);
    });
    test("throws on wrong parameters", () => {
        expect(() => packer.add(42)).toThrow("MacrectsPacker.add(): Wrong parameters");
    });
});

describe("#sort", () => {
    test("does not mutate input array", () => {
        let input = [
            { width: 1, height: 1 },
            { width: 2, height: 2 }
        ];
        packer.sort(input);
        expect(input[0].width).toBe(1);
    });

    test("works correctly by area", () => {
        let input = [
            { width: 1, height: 1 },
            { width: 3, height: 1 },
            { width: 2, height: 2 }
        ];
        let output = packer.sort(input, PACKING_LOGIC.MAX_AREA);
        expect(output[0].width).toBe(2);
        expect(output[1].width).toBe(3);
        expect(output[2].width).toBe(1);
    });

    test("works correctly by edge", () => {
        let input = [
            { width: 1, height: 1 },
            { width: 3, height: 1 },
            { width: 2, height: 2 }
        ];
        let output = packer.sort(input, PACKING_LOGIC.MAX_EDGE);
        expect(output[0].width).toBe(3);
        expect(output[1].width).toBe(2);
        expect(output[2].width).toBe(1);
    });
    test("breaks equal sort values by hash, highest first", () => {
        const sorted = packer.sort(
            [
                { width: 512, height: 512, hash: "1" },
                { width: 512, height: 512, hash: "3" },
                { width: 512, height: 512, hash: "2" }
            ],
            PACKING_LOGIC.MAX_EDGE
        );
        expect(sorted.map((rect) => rect.hash)).toEqual(["3", "2", "1"]);
    });
});

describe("#addArray", () => {
    test("adds multiple elements to bins", () => {
        let input = [
            { width: 1000, height: 1000, data: { num: 1 } },
            { width: 1000, height: 1000, data: { num: 2 } }
        ];
        packer.addArray(input);
        expect(packer.bins.length).toBe(2);
    });

    test("adds the big rects first", () => {
        let input = [
            { width: 600, height: 20, data: { num: 1 } },
            { width: 600, height: 20, data: { num: 2 } },
            { width: 1000, height: 1000, data: { num: 3 } },
            { width: 1000, height: 1000, data: { num: 4 } }
        ];
        packer.addArray(input);
        expect(packer.bins.length).toBe(2);
    });

    test("adds the big rects & big hash first", () => {
        let input = [
            { width: 600, height: 20, data: { num: 1 }, hash: "aaa" },
            { width: 600, height: 20, data: { num: 2 }, hash: "bbb" },
            { width: 1000, height: 1000, data: { num: 3 }, hash: "ccc" },
            { width: 1000, height: 1000, data: { num: 4 }, hash: "ddd" }
        ];
        packer.addArray(input);
        expect(packer.bins.length).toBe(2);
        expect(packer.bins[0].rects[0].hash).toBe("ddd");
        expect(packer.bins[0].rects[1].hash).toBe("bbb");
    });

    test("add empty array", () => {
        packer.addArray([]); // test null array error
        expect(packer.bins.length).toBe(0);
    });

    test("add one element array", () => {
        let input = [{ width: 600, height: 20, data: { num: 1 }, hash: "aaa" }];
        packer.addArray(input); // test null array error
        expect(packer.bins.length).toBe(1);
    });

    test("add empty array in non-exclusive tag mode", () => {
        packer = new MaxRectsPacker(1024, 1024, 0, { ...opt, tag: true, exclusiveTag: false });
        packer.addArray([]);
        expect(packer.bins).toHaveLength(0);
    });

    test("keeps one tag group together in non-exclusive tag mode", () => {
        packer = new MaxRectsPacker(1024, 1024, 0, { ...opt, tag: true, exclusiveTag: false });
        packer.addArray([
            { width: 256, height: 256, data: { tag: "one" } },
            { width: 256, height: 256, data: { tag: "one" } }
        ]);
        expect(packer.bins).toHaveLength(1);
        expect(packer.bins[0].rects).toHaveLength(2);
    });
});

describe("#save & load", () => {
    test("Load old bins and continue packing", () => {
        packer.options.tag = true;
        let input = [
            { width: 512, height: 512, data: { num: 1 } },
            { width: 512, height: 512, data: { num: 2 }, tag: "one" },
            { width: 512, height: 512, data: { num: 3 }, tag: "one" },
            { width: 512, height: 512, data: { num: 4 } }
        ];
        packer.addArray(input);
        expect(packer.bins.length).toBe(2);
        expect(packer.bins[0].rects.length).toBe(2);
        expect(packer.bins[1].rects.length).toBe(2);
        let bins = packer.save();
        expect(bins[0].rects.length).toBe(0);
        expect(bins[1].tag).toBe("one");
        packer.load(bins);
        packer.addArray(input);
        expect(packer.bins.length).toBe(2);
        expect(packer.bins[0].rects.length).toBe(2);
        expect(packer.bins[1].rects.length).toBe(2);
        expect(packer.bins[1].tag).toBe("one");
    });
    test("save keeps the free space and load restores it", () => {
        // 256 then 512 grows the bin to 768x512 and leaves free space behind. A single rect would not:
        // with smart sizing the bin shrinks to exactly that rect and freeRects ends up empty.
        const makeInput = () => [
            { width: 256, height: 256, data: { num: 1 } },
            { width: 512, height: 512, data: { num: 2 } },
            { width: 128, height: 128, data: { num: 3 } }
        ];
        const [first, second, third] = makeInput();
        packer.add(first);
        packer.add(second);
        const saved = packer.save();

        expect(saved[0].rects).toHaveLength(0); // placed rects are never serialized
        expect(saved[0].freeRects.length).toBeGreaterThan(0);
        for (const freeRect of saved[0].freeRects) {
            expect(Object.keys(freeRect).sort()).toEqual(["height", "width", "x", "y"]);
        }

        // a packer that never saved must place the next rect in exactly the same spot
        const control = new MaxRectsPacker(1024, 1024, 0, opt);
        for (const rect of makeInput()) control.add(rect);

        const restored = new MaxRectsPacker(1024, 1024, 0, opt);
        restored.load(saved);
        expect(restored.bins).toHaveLength(1);
        expect(restored.bins[0].width).toBe(packer.bins[0].width);
        expect(restored.bins[0].height).toBe(packer.bins[0].height);
        expect(restored.bins[0].freeRects).toHaveLength(saved[0].freeRects.length);
        expect(restored.bins[0].freeRects[0]).toBeInstanceOf(Rectangle);

        restored.add(third);
        expect(restored.bins).toHaveLength(1);
        expect(restored.bins[0].rects).toHaveLength(1);
        expect(restored.bins[0].rects[0].x).toBe(control.bins[0].rects[2].x);
        expect(restored.bins[0].rects[0].y).toBe(control.bins[0].rects[2].y);
    });

    test("load turns a bin bigger than the packer into an oversized bin", () => {
        packer.load([
            {
                width: 2048,
                height: 2048,
                maxWidth: 2048,
                maxHeight: 2048,
                freeRects: [],
                rects: [],
                options: {}
            }
        ]);
        expect(packer.bins[0]).toBeInstanceOf(OversizedElementBin);
        expect(packer.bins[0].width).toBe(2048);
        expect(packer.bins[0].height).toBe(2048);
    });
});

describe("misc functionalities", () => {
    test("deep repack leaves a clean packer untouched", () => {
        packer.add(256, 256);
        const bin = packer.bins[0];
        for (const each of packer.bins) each.setDirty(false);
        expect(packer.dirty).toBe(false);

        packer.repack(false);

        // a real deep repack resets and rebuilds the bins, so keeping the same instance proves the
        // early return was taken
        expect(packer.bins[0]).toBe(bin);
        expect(packer.rects).toHaveLength(1);
    });

    test("currentBinIndex follows next()", () => {
        expect(packer.currentBinIndex).toBe(0);
        packer.add(256, 256);
        expect(packer.currentBinIndex).toBe(0);
        packer.next();
        expect(packer.currentBinIndex).toBe(1);
    });
    test("passes padding through", () => {
        packer = new MaxRectsPacker(1024, 1024, 4, opt);
        packer.add(500, 500, { num: 1 });
        packer.add(500, 500, { num: 1 });
        packer.add(500, 500, { num: 1 });
        expect(packer.bins[0].width).toBe(1004);
    });

    test("get bins dirty status", () => {
        packer = new MaxRectsPacker(1024, 1024, 4, opt);
        packer.add(508, 508, { num: 1 });
        let tester1 = packer.add(new Rectangle(508, 508));
        let tester2 = packer.add(508, 508, { num: 3 });
        expect(packer.dirty).toBe(true);
        for (let bin of packer.bins) bin.setDirty(false);
        expect(packer.dirty).toBe(false);
        tester1.height = 512;
        expect(packer.dirty).toBe(true);
        for (let bin of packer.bins) bin.setDirty(false);
        tester2.height = 512;
        expect(packer.dirty).toBe(true);
    });

    test("quick repack & deep repack", () => {
        packer = new MaxRectsPacker(1024, 1024, 0, {
            ...opt,
            tag: true
        });
        let rect = packer.add(1024, 512, { hash: "6" });
        packer.add(512, 512, { hash: "5" });
        packer.add(512, 512, { hash: "4" });
        packer.add(512, 512, { hash: "3" });
        packer.add({ width: 512, height: 512, data: { hash: "2", tag: "one" } });
        packer.add({ width: 512, height: 512, data: { hash: "1" }, tag: "one" });
        expect(packer.bins.length).toBe(3);
        for (let bin of packer.bins) bin.setDirty(false); // clean dirty status
        rect.width = 512; // shrink width
        packer.repack(); // quick repack
        expect(packer.bins.length).toBe(3);
        packer.repack(false); // deep repack
        expect(packer.bins.length).toBe(2);
        rect.height = 1024; // enlarge height
        rect.tag = "one";
        packer.repack(); // quick repack
        expect(packer.bins.length).toBe(3);
        expect(packer.bins[2].tag).toBe("one");
        packer.repack(false); // deep repack
        expect(packer.bins.length).toBe(2);
    });

    test("Packer allow rotation", () => {
        packer = new MaxRectsPacker(500, 400, 1, {
            ...opt,
            smart: false,
            allowRotation: true
        });
        packer.add(398, 98);
        packer.add(398, 98);
        packer.add(398, 98);
        let x = packer.add(398, 98);
        expect(x.rot).toBe(true);
    });

    test("Per rectangle allow rotation", () => {
        packer = new MaxRectsPacker(500, 400, 1, {
            ...opt,
            smart: false,
            allowRotation: true
        });
        packer.add(448, 98);
        packer.add(448, 98);
        packer.add(448, 98);
        packer.add(448, 98);
        // false overriding
        let x = packer.add(398, 48, { allowRotation: false });
        expect(packer.bins.length).toBe(2);
        expect(x.rot).toBe(false);

        packer = new MaxRectsPacker(500, 400, 1, {
            ...opt,
            smart: false,
            allowRotation: false
        });
        packer.add(448, 98);
        packer.add(448, 98);
        packer.add(448, 98);
        packer.add(448, 98);
        // true overriding
        x = packer.add(398, 48, { allowRotation: true });
        expect(packer.bins.length).toBe(1);
        expect(x.rot).toBe(true);
    });
});
