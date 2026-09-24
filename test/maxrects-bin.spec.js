import { beforeEach, describe, expect, test } from "vitest";
import { MaxRectsBin } from "../src/maxrects-bin";
import { Rectangle } from "../src/geom/Rectangle";
import { EDGE_MAX_VALUE } from "../src/types";

const opt = {
    smart: true,
    pot: true,
    square: false,
    allowRotation: false,
    tag: true
};

let bin;

// The monkey tests are the main regression net for the placement algorithm, so their input has to be
// reproducible: `Math.random()` made a failure impossible to replay. Each of them draws from its own
// seeded stream, which also makes the inputs independent of test order — shuffling the suite changes
// nothing but the order.
const SEED_BASE = Number(process.env.MONKEY_SEED ?? 0x5eed);
const seeded = (offset) => mulberry32(SEED_BASE + offset);

// Each stream is `mulberry32(SEED_BASE + offset)`, so a failure has to report the *base* seed and the
// offset. Reporting the derived value would be a trap: passing it as MONKEY_SEED makes it the new base,
// which selects a different stream and does not reproduce the failure.
const replayInfo = (offset, label) => `[${label}] replay with MONKEY_SEED=${SEED_BASE} (this stream is base+${offset})`;

// Minimal dependency-free seeded PRNG (mulberry32).
function mulberry32(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Fills `target` with random rects until it refuses one, then asserts what must hold for every
 * placement: no two rects overlap, and none leaves the bin's usable area (its border inset).
 *
 * Every assertion carries `replay`, so whichever one fails says how to reproduce that input.
 *
 * @param target - the bin to fill
 * @param random - a seeded PRNG, so a failure can be replayed
 * @param replay - replay instructions from `replayInfo()`, attached to every assertion
 */
function fillWithRandomRects(target, random, replay) {
    const placed = [];
    while (true) {
        const width = Math.floor(random() * 200);
        const height = Math.floor(random() * 200);
        const rect = new Rectangle(width, height);

        const position = target.add(rect);
        if (!position) break;

        expect(position.width, replay).toBe(width);
        expect(position.height, replay).toBe(height);
        placed.push(position);
    }

    expect(target.width, replay).toBeLessThanOrEqual(target.maxWidth);
    expect(target.height, replay).toBeLessThanOrEqual(target.maxHeight);

    const border = target.options.border ?? 0;
    placed.forEach((rect1) => {
        placed.forEach((rect2) => {
            if (rect1 !== rect2) {
                expect(
                    rect1.collide(rect2),
                    `${replay}: intersection ${JSON.stringify(rect1)} ${JSON.stringify(rect2)}`
                ).toBe(false);
            }
        });

        expect(rect1.x, replay).toBeGreaterThanOrEqual(border);
        expect(rect1.y, replay).toBeGreaterThanOrEqual(border);
        expect(rect1.x + rect1.width, replay).toBeLessThanOrEqual(target.width - border);
        expect(rect1.y + rect1.height, replay).toBeLessThanOrEqual(target.height - border);
    });

    return placed;
}

describe("no padding", () => {
    beforeEach(() => {
        bin = new MaxRectsBin(1024, 1024, 0, opt);
    });

    test("is initially empty", () => {
        expect(bin.width).toBe(0);
        expect(bin.height).toBe(0);
    });

    test("adds rects correctly", () => {
        let position = bin.add(200, 100, {});
        expect(position.x).toBe(0);
        expect(position.y).toBe(0);
    });

    test("edge case: only rotated version fits and should be set", () => {
        const edgeCaseBin = new MaxRectsBin(256, 1024, 0, { allowRotation: true, pot: false });
        edgeCaseBin.add(260, 80);
        edgeCaseBin.add(260, 80);
        edgeCaseBin.add(260, 80);
        edgeCaseBin.add(260, 80);
        expect(edgeCaseBin.rects).toHaveLength(4);
    });

    test("report/set bin dirty status", () => {
        bin.add(200, 100, {});
        expect(bin.dirty).toBe(true); // add element to bin will render bin dirty
        bin.setDirty(false);
        expect(bin.dirty).toBe(false); // clean bin dirty
        bin.add(200, 100, {});
        expect(bin.dirty).toBe(true); // add new element is dirty
        bin.setDirty(false);
        bin.setDirty();
        expect(bin.dirty).toBe(true); // setDirty is dirty
        bin.reset();
        expect(bin.dirty).toBe(false); // reset clean dirty
        let rect = bin.add(new Rectangle(200, 100));
        bin.setDirty(false);
        rect.width = 256;
        expect(bin.dirty).toBe(true); // modify rects is dirty
    });

    test("updates size correctly", () => {
        bin.add(200, 100, {});
        expect(bin.width).toBe(256);
        expect(bin.height).toBe(128);
    });

    test("stores data correctly", () => {
        bin.add(200, 100, { foo: "bar" });
        expect(bin.rects[0].data.foo).toBe("bar");
    });

    test("set rotation correctly", () => {
        bin = new MaxRectsBin(1024, 1024, 0, { ...opt, allowRotation: true });
        bin.add({ width: 512, height: 1024 });
        bin.add({ width: 1024, height: 512 });
        expect(bin.rects.length).toBe(2);
        expect(bin.rects[1].rot).toBe(true);
        bin.reset(true);
        bin.add({ width: 512, height: 1024 });
        bin.add({ width: 1024, height: 512, rot: true });
        expect(bin.rects.length).toBe(2);
        expect(bin.rects[1].rot).toBe(false);
    });

    test("stores custom rect correctly", () => {
        bin.add({ width: 200, height: 100, foo: "bar" });
        expect(bin.rects[0].foo).toBe("bar");
    });

    test("none tag bin reject all tagged rects on exclusive tag mode", () => {
        bin.add({ width: 200, height: 100 });
        bin.add({ width: 200, height: 100, tag: "foo" });
        bin.add({ width: 200, height: 100, tag: "bar" });
        expect(bin.rects.length).toBe(1);
    });

    test("tagged bin reject different tagged rects on exclusive tag mode", () => {
        bin.tag = "foo";
        bin.add({ width: 200, height: 100, tag: "foo" });
        let two = bin.add({ width: 200, height: 100, tag: "bar" });
        expect(bin.rects.length).toBe(1);
        expect(bin.rects[0].tag).toBe("foo");
        expect(two).toBeUndefined();
    });

    test("tagged bin accept different tagged rects on non-exclusive tag mode", () => {
        bin.tag = "foo";
        bin.options.exclusiveTag = false;
        bin.add({ width: 200, height: 100, tag: "foo" });
        let two = bin.add({ width: 200, height: 100, tag: "bar" });
        expect(bin.rects.length).toBe(2);
        expect(bin.rects[0].tag).toBe("foo");
        expect(two).toBeDefined();
    });

    test("fits squares correctly", () => {
        let i = 0;
        while (bin.add(100, 100, { num: i })) {
            // circuit breaker
            if (i++ === 1000) {
                break;
            }
        }
        expect(i).toBe(100);
        expect(bin.rects.length).toBe(100);
        expect(bin.width).toBe(1024);
        expect(bin.height).toBe(1024);

        bin.rects.forEach((rect, i) => {
            expect(rect.data.num).toBe(i);
        });
    });

    test("reset & deep reset", () => {
        bin.add({ width: 200, height: 100 });
        bin.add({ width: 200, height: 100 });
        bin.add({ width: 200, height: 100 });
        expect(bin.rects.length).toBe(3);
        expect(bin.width).toBe(512);
        bin.reset();
        expect(bin.width).toBe(0);
        expect(bin.freeRects.length).toBe(1);
        let unpacked = bin.repack();
        expect(unpacked).toBeUndefined();
        expect(bin.width).toBe(512);
        bin.reset(true);
        expect(bin.width).toBe(0);
        expect(bin.rects.length).toBe(0);
        expect(bin.options.tag).toBe(true);
        bin.reset(true, true);
        expect(bin.options.tag).toBe(false);
    });

    test("repack", () => {
        bin.add({ width: 512, height: 512, id: "one" });
        let rect2 = bin.add({ width: 512, height: 512, id: "two" });
        bin.add({ width: 512, height: 512, id: "three" });
        rect2.width = 1024;
        rect2.height = 513;
        let unpacked = bin.repack();
        expect(unpacked.length).toBe(2);
        expect(unpacked[0].id).toBe("one");
        expect(unpacked[1].id).toBe("three");
        expect(bin.rects.length).toBe(1);
    });

    test("monkey testing", () => {
        fillWithRandomRects(bin, seeded(1), replayInfo(1, "no padding / monkey testing"));
    });

    test("rejects rects through the multi-argument add when tags disagree", () => {
        bin.tag = "foo";
        expect(bin.add(200, 100, { tag: "bar" })).toBeUndefined();
        expect(bin.add(200, 100)).toBeUndefined();
        expect(bin.add(200, 100, { tag: "foo" })).toBeDefined();
        expect(bin.rects).toHaveLength(1);
    });

    test("deep reset drops the bin data and tag", () => {
        bin.tag = "foo";
        bin.data = { keep: false };
        bin.add(200, 100, { tag: "foo" });
        expect(bin.rects).toHaveLength(1);

        bin.reset(true);

        expect(bin.tag).toBeUndefined();
        expect(bin.data).toBeUndefined();
        expect(bin.rects).toHaveLength(0);
    });

    test("repack sorts equal-sized rects by hash, highest first", () => {
        bin.add({ width: 512, height: 512, hash: "1" });
        bin.add({ width: 512, height: 512, hash: "3" });
        bin.add({ width: 512, height: 512, hash: "2" });
        bin.repack();
        expect(bin.rects.map((rect) => rect.hash)).toEqual(["3", "2", "1"]);
    });

    test("throws on wrong parameters", () => {
        expect(() => bin.add(42)).toThrow("MacrectsBin.add(): Wrong parameters");
    });
});

const padding = 4;

describe("constructor", () => {
    test("a non-smart bin starts at its full size", () => {
        const fixed = new MaxRectsBin(1024, 512, 0, { ...opt, smart: false, pot: false });
        expect(fixed.width).toBe(1024);
        expect(fixed.height).toBe(512);
    });

    test("falls back to EDGE_MAX_VALUE when no size is given", () => {
        const defaultBin = new MaxRectsBin();
        expect(defaultBin.maxWidth).toBe(EDGE_MAX_VALUE);
        expect(defaultBin.maxHeight).toBe(EDGE_MAX_VALUE);
        expect(defaultBin.padding).toBe(0);
    });

    test("reset restores the full size of a non-smart bin", () => {
        const fixed = new MaxRectsBin(1024, 512, 0, { ...opt, smart: false, pot: false });
        fixed.reset();
        expect(fixed.width).toBe(1024);
        expect(fixed.height).toBe(512);
    });
});

describe("padding", () => {
    beforeEach(() => {
        bin = new MaxRectsBin(1024, 1024, padding, opt);
    });

    test("is initially empty", () => {
        expect(bin.width).toBe(0);
        expect(bin.height).toBe(0);
    });

    test("handles padding correctly", () => {
        bin.add(512, 512, {});
        bin.add(512 - padding, 512, {});
        bin.add(512, 512 - padding, {});
        expect(bin.width).toBe(1024);
        expect(bin.height).toBe(1024);
        expect(bin.rects.length).toBe(3);
    });

    test("adds rects with sizes close to the max", () => {
        expect(bin.add(1024, 1024)).toBeDefined();
        expect(bin.rects.length).toBe(1);
    });

    test("edge case: multiple rects with slightly bigger size then maxWidth should be placed rotated", () => {
        const edgeCaseBin = new MaxRectsBin(256, 1024, padding, {
            allowRotation: true,
            pot: false,
            square: false,
            smart: true
        });
        edgeCaseBin.add(260, 80);
        edgeCaseBin.add(260, 80);
        edgeCaseBin.add(260, 80);
        edgeCaseBin.add(260, 80);

        expect(edgeCaseBin.rects).toHaveLength(4);
        expect(edgeCaseBin.rects[3].rot).toBeTruthy();
        expect(edgeCaseBin.rects[3].width).toBe(80);
    });

    test("monkey testing", () => {
        fillWithRandomRects(bin, seeded(2), replayInfo(2, "padding / monkey testing"));
    });
});

const border = 5;

describe("border", () => {
    beforeEach(() => {
        const borderOpt = {
            ...opt,
            border,
            square: false
        };
        bin = new MaxRectsBin(1024, 1024, padding, borderOpt);
    });

    test("is initially empty", () => {
        expect(bin.width).toBe(0);
        expect(bin.height).toBe(0);
    });

    test("handles border & padding correctly", () => {
        let size = 512 - border * 2; //
        let pos1 = bin.add(size + 1, size, {});
        expect(pos1.x).toBe(5);
        expect(pos1.y).toBe(5);
        expect(bin.width).toBe(1024);
        expect(bin.height).toBe(512);
        let pos2 = bin.add(size, size, {});
        expect(pos2.x - pos1.x - pos1.width).toBe(padding); // handle space correctly
        expect(pos2.y).toBe(border);
        expect(bin.width).toBe(1024);
        expect(bin.height).toBe(512);
        bin.add(size, size, {});
        bin.add(512, 508, {});
        expect(bin.width).toBe(1024);
        expect(bin.height).toBe(1024);
        expect(bin.rects.length).toBe(3);
    });

    test("adds rects with sizes close to the max", () => {
        expect(bin.add(1024, 1024)).toBeUndefined();
        expect(bin.rects.length).toBe(0);
    });

    test("reset keeps the border", () => {
        bin.reset();
        expect(bin.border).toBe(border);
        expect(bin.width).toBe(0); // smart sizing starts empty again
    });

    const SUPER_MONKEY_LOOPS = 5;
    test(`super monkey testing (${SUPER_MONKEY_LOOPS} loop)`, () => {
        for (let i = 0; i < SUPER_MONKEY_LOOPS; i++) {
            // One stream per iteration, so the five rounds are independent of each other and of the
            // order the suite runs in.
            const random = seeded(10 + i);
            const padding = Math.floor(random() * 10);
            const border = Math.floor(random() * 20);
            bin = new MaxRectsBin(1024, 1024, padding, { ...opt, border, square: false });

            fillWithRandomRects(bin, random, replayInfo(10 + i, `super monkey testing, iteration ${i}`));
        }
    });
});

describe("logic FILL_WIDTH", () => {
    beforeEach(() => {
        bin = new MaxRectsBin(1024, 512, 0, { allowRotation: true, logic: 2, pot: false, square: false });
    });

    test("sets all elements along width with the smallest height", () => {
        /**
         * Visualize the placement result
         * _______________________
         * | ███  ███  ███      |
         * ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
         */
        let position1 = bin.add(300, 50, {});
        let position2 = bin.add(50, 300, {});
        let position3 = bin.add(300, 50, {});
        expect(position1.x).toBe(0);
        expect(position1.y).toBe(0);
        expect(position2.x).toBe(300);
        expect(position2.y).toBe(0);
        expect(position3.x).toBe(600);
        expect(position3.y).toBe(0);
        expect(bin.width).toBe(900);
        expect(bin.height).toBe(50);
    });

    test("adds rects correctly with rotation", () => {
        /**
         * Visualize the placement result (1 vertical at the end)
         * _______________________
         * | ███  ███  ███  █ |
         * | ███  ███  ███  █ |
         * | ███  ███  ███  █ |
         * | ██████                     |
         * ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
         */
        const rects = [
            [300, 100],
            [100, 300],
            [300, 100],
            [300, 100],
            [100, 300],
            [300, 100],
            [300, 100],
            [100, 300],
            [300, 100],
            [300, 100],
            [300, 100],
            [100, 600]
        ];
        rects.forEach((rect) => bin.add(rect[0], rect[1]));
        expect([bin.rects[0].x, bin.rects[0].y]).toEqual([0, 0]);
        expect([bin.rects[1].x, bin.rects[1].y]).toEqual([300, 0]);
        expect([bin.rects[2].x, bin.rects[2].y]).toEqual([600, 0]);
        expect([bin.rects[3].x, bin.rects[3].y]).toEqual([0, 100]);
        expect([bin.rects[4].x, bin.rects[4].y]).toEqual([300, 100]);
        expect([bin.rects[5].x, bin.rects[5].y]).toEqual([600, 100]);
        expect([bin.rects[6].x, bin.rects[6].y]).toEqual([900, 0]);
        expect([bin.rects[7].x, bin.rects[7].y]).toEqual([0, 200]);
        expect([bin.rects[8].x, bin.rects[8].y]).toEqual([300, 200]);
        expect([bin.rects[9].x, bin.rects[9].y]).toEqual([600, 200]);
        expect([bin.rects[10].x, bin.rects[10].y]).toEqual([0, 300]);
        expect([bin.rects[11].x, bin.rects[11].y]).toEqual([300, 300]);
        expect(bin.width).toBe(1000);
        expect(bin.height).toBe(400);
    });
});
