import { describe, expect, test } from "vitest";
import { MaxRectsPacker } from "../src/maxrects-packer";
import { MaxRectsBin } from "../src/maxrects-bin";
import { OversizedElementBin } from "../src/oversized-element-bin";
import { Rectangle } from "../src/geom/Rectangle";

describe("user data boundaries", () => {
    test.each([true, false])("addArray preserves a frozen input array with exclusiveTag=%s", (exclusiveTag) => {
        const first = { width: 16, height: 16, data: Object.freeze({ tag: "z", id: "first" }) };
        const second = { width: 32, height: 32, data: Object.freeze({ tag: "a", id: "second" }) };
        const input = Object.freeze([first, second]);
        const packer = new MaxRectsPacker(128, 128, 0, { tag: true, exclusiveTag });

        expect(packer.addArray(input)).toBeUndefined();
        expect(input).toEqual([first, second]);
        expect(input[0]).toBe(first);
        expect(input[1]).toBe(second);
        expect(packer.rects).toHaveLength(2);
        expect(packer.rects).toContain(first);
        expect(packer.rects).toContain(second);
        expect(first.data).toEqual({ tag: "z", id: "first" });
        expect(second.data).toEqual({ tag: "a", id: "second" });
    });

    test.each([
        ["packer", MaxRectsPacker],
        ["bin", MaxRectsBin]
    ])("%s numeric add preserves explicit null and omitted defaults", (_name, Ctor) => {
        const target = new Ctor(128, 128);
        expect(target.add(16, 16, null).data).toBeNull();
        expect(target.add(16, 16).data).toEqual({});
        expect(target.add(16, 16, undefined).data).toBeUndefined();
    });

    test("assigning null clears data and marks the Rectangle dirty only when its value changes", () => {
        const rect = new Rectangle(16, 16);
        rect.data = { id: "old", allowRotation: false };
        rect.setDirty(false);
        rect.data = null;
        expect(rect.data).toBeNull();
        expect(rect.dirty).toBe(true);
        expect(rect.allowRotation).toBe(false);
        rect.setDirty(false);
        rect.data = null;
        expect(rect.data).toBeNull();
        expect(rect.dirty).toBe(false);
    });

    test("oversized constructors distinguish an explicit null from omitted data", () => {
        const explicit = new OversizedElementBin(256, 256, null);
        expect(explicit.data).toBeNull();
        expect(explicit.rects[0].data).toBeNull();
        const omitted = new OversizedElementBin(256, 256);
        expect(omitted.data).toBeNull();
        expect(omitted.rects[0].data).toEqual({});
        const packer = new MaxRectsPacker(128, 128);
        expect(packer.add(256, 256, null).data).toBeNull();
        expect(packer.bins[0].data).toBeNull();
    });

    test.each(["", "atlas", null, false, 0])("explicit tag %s survives normal and oversized save/load", (tag) => {
        for (const maxWidth of [128, 256]) {
            const saved = {
                width: 64,
                height: 64,
                maxWidth,
                maxHeight: 128,
                options: { tag: true, exclusiveTag: false, smart: false, pot: false },
                tag,
                rects: [],
                freeRects: [{ width: 64, height: 64, x: 0, y: 0 }]
            };
            const packer = new MaxRectsPacker(128, 128);
            packer.load([saved]);
            expect(packer.bins[0].tag).toBe(tag);
            expect(packer.save()[0]).toHaveProperty("tag", tag);
            expect(packer.save()[0].rects).toEqual([]);
        }
    });

    test.each(["", null, false, 0])("exclusive restored bin with falsy label %s reuses free space", (tag) => {
        const options = { tag: true, exclusiveTag: true, smart: false, pot: false };
        const packer = new MaxRectsPacker(128, 128, 0, options);
        packer.load([
            {
                width: 128,
                height: 128,
                maxWidth: 128,
                maxHeight: 128,
                options,
                tag,
                rects: [],
                freeRects: [{ width: 64, height: 64, x: 64, y: 64 }]
            }
        ]);
        const restored = packer.bins[0];
        const input = [
            { width: 16, height: 16 },
            { width: 16, height: 16, tag },
            { width: 16, height: 16, data: { tag } }
        ];
        for (const rect of input) {
            expect(packer.add(rect)).toBe(rect);
            expect(packer.bins).toHaveLength(1);
            expect(packer.bins[0]).toBe(restored);
            expect(restored.rects).toContain(rect);
            expect(rect.x).toBeGreaterThanOrEqual(64);
            expect(rect.y).toBeGreaterThanOrEqual(64);
        }
        expect(restored.tag).toBe(tag);
        expect(packer.save()[0]).toHaveProperty("tag", tag);

        // Falsy data tags still fall back to a truthy rect tag, which the untagged gate must refuse.
        const tagged = { width: 16, height: 16, tag: "other", data: { tag } };
        expect(packer.add(tagged)).toBe(tagged);
        expect(packer.bins).toHaveLength(2);
        expect(restored.rects).not.toContain(tagged);
        expect(restored.tag).toBe(tag);
        expect(tagged.data.tag).toBe(tag);
        expect(packer.bins[1].tag).toBe("other");
    });

    test("truthy exclusive labels still refuse untagged and differently tagged rects", () => {
        const bin = new MaxRectsBin(128, 128, 0, { tag: true, exclusiveTag: true });
        bin.tag = "atlas";
        expect(bin.add({ width: 16, height: 16 })).toBeUndefined();
        expect(bin.add({ width: 16, height: 16, data: { tag: "" } })).toBeUndefined();
        expect(bin.add({ width: 16, height: 16, tag: "other" })).toBeUndefined();
        const matching = { width: 16, height: 16, data: { tag: "atlas" } };
        expect(bin.add(matching)).toBe(matching);
        expect(bin.rects).toEqual([matching]);
        expect(bin.tag).toBe("atlas");
    });

    test("saved options isolate the active bin while keeping nested values shallow", () => {
        const packer = new MaxRectsPacker(128, 128, 0, { tag: true, exclusiveTag: false });
        packer.add(16, 16, { tag: "hud" });
        const bin = packer.bins[0];
        bin.options.extension = { value: "shared" };
        const saved = packer.save();
        expect(saved[0].options).toEqual(bin.options);
        expect(saved[0].options).not.toBe(bin.options);
        expect(saved[0].options.extension).toBe(bin.options.extension);
        saved[0].options.exclusiveTag = true;
        expect(bin.options.exclusiveTag).toBe(false);
        bin.options.pot = false;
        expect(saved[0].options.pot).toBe(true);
        expect(packer.add(16, 16, { tag: "world" })).toBe(packer.rects[1]);
        expect(packer.bins).toHaveLength(1);
    });

    test("full repack rebuilds library bins while preserving rect-owned business metadata", () => {
        const packer = new MaxRectsPacker(128, 128, 0, { tag: true, exclusiveTag: false });
        const data = Object.freeze({ tag: "hud", asset: Object.freeze({ id: "sprite" }) });
        const rect = packer.add({ width: 16, height: 16, data, assetId: "sprite" });
        const oldBin = packer.bins[0];
        oldBin.tag = "atlas";
        oldBin.data = { id: "bin-owned" };
        oldBin.customField = "bin-owned";
        packer.repack(false);
        expect(packer.bins[0]).not.toBe(oldBin);
        expect(packer.bins[0].tag).toBeUndefined();
        expect(packer.bins[0].data).toBeUndefined();
        expect(packer.bins[0].customField).toBeUndefined();
        expect(packer.rects[0]).toBe(rect);
        expect(rect.data).toBe(data);
        expect(rect.assetId).toBe("sprite");
        expect(oldBin.data).toEqual({ id: "bin-owned" });
    });
});
