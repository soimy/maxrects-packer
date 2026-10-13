import { describe, expect, test } from "vitest";
import { OversizedElementBin } from "../src/oversized-element-bin";
import { Rectangle } from "../src/geom/Rectangle";
import { MaxRectsPacker } from "../src/maxrects-packer";

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

    test("#clone holds a copy of the rect, not the rect itself", () => {
        const bin = new OversizedElementBin(2000, 2000, { foo: "bar" });
        const clone = bin.clone();
        expect(clone.width).toBe(2000);
        expect(clone.rects[0]).toEqual(bin.rects[0]);
        // clone() used to hand out the same object, so mutating the clone silently mutated the source
        // bin. It copies now: neither bin reaches the other's rect, and only the payload is shared,
        // because the copy is shallow.
        expect(clone.rects[0]).not.toBe(bin.rects[0]);
        expect(clone.rects[0].data).toBe(bin.rects[0].data);

        clone.rects[0].width = 100;
        expect(bin.rects[0].width).toBe(2000);
        bin.rects[0].height = 50;
        expect(clone.rects[0].height).toBe(2000);
    });

    test("#clone copies the tag", () => {
        const bin = new OversizedElementBin(2000, 2000, { foo: "bar" });
        bin.tag = "one";
        expect(bin.clone().tag).toBe("one");
    });

    test("#clone preserves a loaded placeholder through save", () => {
        const saved = [
            {
                width: 128,
                height: 128,
                maxWidth: 2048,
                maxHeight: 512,
                options: { smart: true, pot: false, square: false, allowRotation: true, exclusiveTag: true },
                tag: "atlas",
                rects: [],
                freeRects: [
                    { width: 64, height: 128, x: 64, y: 0 },
                    { width: 128, height: 64, x: 0, y: 64 }
                ]
            }
        ];
        const packer = new MaxRectsPacker(256, 256);
        packer.load(saved);
        const before = packer.save();
        const clone = packer.bins[0].clone();
        expect(clone).toBeInstanceOf(OversizedElementBin);
        expect(clone.rects[0].oversized).toBe(true);
        expect(clone.add(new Rectangle(1, 1))).toBeUndefined();
        packer.bins[0] = clone;
        expect(packer.save()).toEqual(before);
        expect(packer.save()[0].rects).toEqual([]);
    });

    test("#clone isolates free space and options, and shares only the payloads", () => {
        const bin = new OversizedElementBin(2000, 2000, { foo: "bar" });
        bin.data = { name: "atlas" };
        bin.freeRects = [new Rectangle(64, 128, 32, 16)];
        bin.width = 1800;
        bin.height = 1900;
        const clone = bin.clone();
        expect(clone.width).toBe(1800);
        expect(clone.height).toBe(1900);
        expect(clone.data).toBe(bin.data);
        expect(clone.rects[0].data).toBe(bin.rects[0].data);
        expect(clone.freeRects).toEqual(bin.freeRects);
        expect(clone.freeRects).not.toBe(bin.freeRects);
        expect(clone.freeRects[0]).not.toBe(bin.freeRects[0]);
        expect(clone.options).toEqual(bin.options);
        expect(clone.options).not.toBe(bin.options);

        clone.freeRects[0].x = 0;
        clone.freeRects.push(new Rectangle(1, 1));
        clone.options.smart = true;
        expect(bin.freeRects).toHaveLength(1);
        expect(bin.freeRects[0].x).toBe(32);
        expect(bin.options.smart).toBe(false);
        bin.freeRects[0].height = 16;
        bin.options.pot = true;
        expect(clone.freeRects[0].height).toBe(128);
        expect(clone.options.pot).toBe(false);
    });

    test("#clone preserves null bin data from a two-argument construction", () => {
        const bin = new OversizedElementBin(2000, 2000);
        const clone = bin.clone();
        expect(clone.data).toBeNull();
        expect(clone.rects[0].data).toBe(bin.rects[0].data);
    });

    test("constructor rejects a non-object single argument", () => {
        expect(() => new OversizedElementBin(2000)).toThrow("OversizedElementBin: Wrong parameters");
    });

    test("a two-argument construction leaves data null", () => {
        // The two-argument form is declared (`data?: any`) and supported in TypeScript as well as in
        // JavaScript: leaving `data` out makes the bin report `null`. Pinned so the next reader does not
        // delete the fallback as unreachable code — that is exactly how it was removed once, back when
        // only JavaScript callers could reach it. Omitted rect data keeps its default empty object.
        const bin = new OversizedElementBin(2000, 2000);
        expect(bin.data).toBeNull();
        expect(bin.rects[0].data).toEqual({});
        expect(bin.rects[0].oversized).toBeTruthy();
        expect(bin.width).toBe(2000);
        expect(bin.height).toBe(2000);
    });
});
