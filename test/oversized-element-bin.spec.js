import { describe, expect, test } from "vitest";
import { OversizedElementBin } from "../src/oversized-element-bin";
import { Rectangle } from "../src/geom/Rectangle";

const oversizedRect = new Rectangle(2000, 2000);
oversizedRect.data = { foo: "bar" };

describe("OversizedElementBin", () => {
    test("stores data correctly", () => {
        let bin = new OversizedElementBin(2000, 2000, { foo: "bar" });
        expect(bin.width).toBe(2000);
        expect(bin.height).toBe(2000);
        expect(bin.rects[0].x).toBe(0);
        expect(bin.rects[0].y).toBe(0);
        expect(bin.rects[0].width).toBe(2000);
        expect(bin.rects[0].height).toBe(2000);
        expect(bin.rects[0].data.foo).toBe("bar");
        expect(bin.rects[0].oversized).toBeTruthy();
    });

    test("stores data correctly via generic type", () => {
        let bin = new OversizedElementBin(oversizedRect);
        expect(bin.width).toBe(2000);
        expect(bin.height).toBe(2000);
        expect(bin.rects[0].x).toBe(0);
        expect(bin.rects[0].y).toBe(0);
        expect(bin.rects[0].width).toBe(2000);
        expect(bin.rects[0].height).toBe(2000);
        expect(bin.rects[0].data.foo).toBe("bar");
        expect(bin.rects[0].oversized).toBeTruthy();
    });

    test("#add returns undefined", () => {
        let bin = new OversizedElementBin(2000, 2000, { foo: "bar" });
        expect(bin.add(1, 1, {})).toBeUndefined();
    });

    test("#reset keeps the oversized bin untouched", () => {
        const bin = new OversizedElementBin(2000, 2000, { foo: "bar" });
        bin.reset(true);
        expect(bin.rects).toHaveLength(1);
        expect(bin.width).toBe(2000);
    });

    test("#repack returns undefined", () => {
        const bin = new OversizedElementBin(2000, 2000, { foo: "bar" });
        expect(bin.repack()).toBeUndefined();
    });

    test("#clone holds the same rect object, not a copy", () => {
        const bin = new OversizedElementBin(2000, 2000, { foo: "bar" });
        const clone = bin.clone();
        expect(clone.width).toBe(2000);
        expect(clone.rects[0]).toEqual(bin.rects[0]);
        // Identity is asserted on purpose, not as an implementation detail: clone() passes the same
        // object into the new bin, so `clone.rects[0].width = 100` is visible through the original as
        // well. Pinning it means a change to isolate the clone has to be deliberate.
        expect(clone.rects[0]).toBe(bin.rects[0]);
    });

    test("constructor rejects a non-object single argument", () => {
        expect(() => new OversizedElementBin(2000)).toThrow("OversizedElementBin: Wrong parameters");
    });
});
