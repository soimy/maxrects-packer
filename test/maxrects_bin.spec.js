"use strict";

let MaxRectsBin = require("../lib/maxrects_bin").MaxRectsBin;
let Rectangle = require("../lib/geom/Rectangle").Rectangle;
let expect = require("chai").expect;

const EDGE_MAX_VALUE = 4096;
const EDGE_MIN_VALUE = 128;
const opt = {
    smart: true,
    pot: true,
    square: false,
    allowRotation: false
}

describe("MaxRectsBin", () => {
    let bin;

    context("no padding", () => {
        beforeEach(() => {
            bin = new MaxRectsBin(1024, 1024, 0, opt);
        });

        it("is initially empty", () => {
            expect(bin.width).to.equal(0);
            expect(bin.height).to.equal(0);
        })

        it("adds rects correctly", () => {
            let position = bin.add(200, 100, {});
            expect(position.x).to.equal(0);
            expect(position.y).to.equal(0);
        });

        it("updates size correctly", () => {
            let position = bin.add(200, 100, {});
            expect(bin.width).to.equal(256);
            expect(bin.height).to.equal(128);
        });

        it("stores data correctly", () => {
            let position = bin.add(200, 100, {foo: "bar"});
            expect(bin.rects[0].data.foo).to.equal("bar");
        });

        it("fits squares correctly", () => {
            let i = 0;
            while(bin.add(100, 100, {number: i})) {
                // circuit breaker
                if (i++ === 1000) {
                    break;
                }
            }
            expect(i).to.equal(100);
            expect(bin.rects.length).to.equal(100);
            expect(bin.width).to.equal(1024);
            expect(bin.height).to.equal(1024);

            bin.rects.forEach((rect, i) => {
                expect(rect.data.number).to.equal(i);
            })
        });

        it("monkey testing", () => {
            let rects = [];
            while (true) {
                let width = Math.floor(Math.random() * 200);
                let height = Math.floor(Math.random() * 200);
                let rect = new Rectangle(0, 0, width, height);

                let position = bin.add(rect);
                if (position) {
                    expect(position.width).to.equal(width);
                    expect(position.height).to.equal(height);
                    rects.push(position);
                } else {
                    break;
                }
            }

            expect(bin.width).to.not.be.above(1024);
            expect(bin.height).to.not.be.above(1024);

            rects.forEach(rect1 => {
                // Make sure rects are not overlapping
                rects.forEach(rect2 => {
                    if (rect1 !== rect2) {
                        expect(rect1.collide(rect2)).to.equal(false, "intersection detected: " + JSON.stringify(rect1) + " " + JSON.stringify(rect2));
                    }
                });

                // Make sure no rect is outside bounds
                expect(rect1.x + rect1.width).to.not.be.above(bin.width);
                expect(rect1.y + rect1.height).to.not.be.above(bin.height);
            });
        });
    })

    context("padding", () => {
        beforeEach(() => {
            bin = new MaxRectsBin(1024, 1024, 4, opt);
        });

        it("is initially empty", () => {
            expect(bin.width).to.equal(0);
            expect(bin.height).to.equal(0);
        })

        it("handles padding correctly", () => {
            bin.add(512, 512, {});
            bin.add(508, 512, {});
            bin.add(512, 508, {});
            expect(bin.width).to.equal(1024);
            expect(bin.height).to.equal(1024);
            expect(bin.rects.length).to.equal(3);
        });

        it("adds rects with sizes close to the max", () => {
            expect(bin.add(1024, 1024)).to.not.equal(undefined);
            expect(bin.rects.length).to.equal(1);
        });

        it("monkey testing", () => {
            bin = new MaxRectsBin(1024, 1024, 40);
            let rects = [];
            while (true) {
                let width = Math.floor(Math.random() * 200);
                let height = Math.floor(Math.random() * 200);
                let rect = new Rectangle(0, 0, width, height);

                let position = bin.add(rect);
                if (position) {
                    expect(position.width).to.equal(width);
                    expect(position.height).to.equal(height);
                    rects.push(position);
                } else {
                    break;
                }
            }

            expect(bin.width).to.not.be.above(1024);
            expect(bin.height).to.not.be.above(1024);

            rects.forEach(rect1 => {
                // Make sure rects are not overlapping
                rects.forEach(rect2 => {
                    if (rect1 !== rect2) {
                        expect(rect1.collide(rect2)).to.equal(false, "intersection detected: " + JSON.stringify(rect1) + " " + JSON.stringify(rect2));
                    }
                });

                // Make sure no rect is outside bounds
                expect(rect1.x + rect1.width).to.not.be.above(bin.width);
                expect(rect1.y + rect1.height).to.not.be.above(bin.height);
            });
        });
    });
});
