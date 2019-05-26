"use strict";

let OversizedElementBin = require("../dist/maxrects-packer").OversizedElementBin;
let Rectangle = require("../dist/maxrects-packer").Rectangle;

const oversizedRect = new Rectangle(2000, 2000);
oversizedRect.data = {foo: "bar"};

describe("OversizedElementBin", () => {
    test("stores data correctly", () => {
        let bin = new OversizedElementBin(2000, 2000, {foo: "bar"});
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
        let bin = new OversizedElementBin(2000, 2000, {foo: "bar"});
        expect(bin.add(1, 1, {})).toBeUndefined();
    });
});
