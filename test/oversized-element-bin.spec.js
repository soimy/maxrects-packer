"use strict";

let OversizedElementBin = require("../dist/maxrects-packer").OversizedElementBin;
let expect = require("chai").expect;
let Rectangle = require("../dist/maxrects-packer").Rectangle;

const oversizedRect = new Rectangle(2000, 2000);
oversizedRect.data = {foo: "bar"};

describe("OversizedElementBin", () => {
    it("stores data correctly", () => {
        let bin = new OversizedElementBin(2000, 2000, {foo: "bar"});
        expect(bin.width).to.equal(2000);
        expect(bin.height).to.equal(2000);
        expect(bin.rects[0].x).to.equal(0);
        expect(bin.rects[0].y).to.equal(0);
        expect(bin.rects[0].width).to.equal(2000);
        expect(bin.rects[0].height).to.equal(2000);
        expect(bin.rects[0].data.foo).to.equal("bar");
        expect(bin.rects[0].oversized).to.equal(true);
    });

    it("stores data correctly via generic type", () => {
        let bin = new OversizedElementBin(oversizedRect);
        expect(bin.width).to.equal(2000);
        expect(bin.height).to.equal(2000);
        expect(bin.rects[0].x).to.equal(0);
        expect(bin.rects[0].y).to.equal(0);
        expect(bin.rects[0].width).to.equal(2000);
        expect(bin.rects[0].height).to.equal(2000);
        expect(bin.rects[0].data.foo).to.equal("bar");
        expect(bin.rects[0].oversized).to.equal(true);
    });

    it("#add returns undefined", () => {
        let bin = new OversizedElementBin(2000, 2000, {foo: "bar"});
        expect(bin.add(1, 1, {})).to.equal(undefined);
    });
});
