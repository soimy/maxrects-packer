"use strict";

let MaxRectsBin = require("../dist/maxrects-packer").MaxRectsBin;
let Rectangle = require("../dist/maxrects-packer").Rectangle;

const EDGE_MAX_VALUE = 4096;
const EDGE_MIN_VALUE = 128;
const opt = {
    smart: true,
    pot: true,
    square: false,
    allowRotation: false,
    tag: true
}

let bin;

describe("no padding", () => {
    beforeEach(() => {
        bin = new MaxRectsBin(1024, 1024, 0, opt);
    });

    test("is initially empty", () => {
        expect(bin.width).toBe(0);
        expect(bin.height).toBe(0);
    })

    test("adds rects correctly", () => {
        let position = bin.add(200, 100, {});
        expect(position.x).toBe(0);
        expect(position.y).toBe(0);
    });

    test("report/set bin dirty status correctly", () => {
        bin.add(200, 100, {});
        expect(bin.dirty).toBe(true);
        bin.setDirty(false);
        expect(bin.dirty).toBe(false);
        bin.add(200, 100, {});
        expect(bin.dirty).toBe(true);
        bin.setDirty(false);
        bin.setDirty();
        expect(bin.dirty).toBe(true);
    });


    test("updates size correctly", () => {
        bin.add(200, 100, {});
        expect(bin.width).toBe(256);
        expect(bin.height).toBe(128);
    });

    test("stores data correctly", () => {
        bin.add(200, 100, {foo: "bar"});
        expect(bin.rects[0].data.foo).toBe("bar");
    });

    test("stores custom rect correctly", () => {
        bin.add({width: 200, height: 100, foo: "bar"});
        expect(bin.rects[0].foo).toBe("bar");
    });

    test("none tag bin reject all tagged rects", () => {
        bin.add({width: 200, height: 100});
        bin.add({width: 200, height: 100, tag: "foo"});
        bin.add({width: 200, height: 100, tag: "bar"});
        expect(bin.rects.length).toBe(1);
    });

    test("tagged bin reject different tagged rects", () => {
        bin.tag = "foo";
        let one = bin.add({width: 200, height: 100, tag: "foo"});
        let two = bin.add({width: 200, height: 100, tag: "bar"});
        expect(bin.rects.length).toBe(1);
        expect(bin.rects[0].tag).toBe("foo");
        expect(two).toBeUndefined();
    });

    test("fits squares correctly", () => {
        let i = 0;
        while(bin.add(100, 100, {number: i})) {
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
            expect(rect.data.number).toBe(i);
        })
    });

    test("monkey testing", () => {
        let rects = [];
        while (true) {
            let width = Math.floor(Math.random() * 200);
            let height = Math.floor(Math.random() * 200);
            let rect = new Rectangle(width, height);

            let position = bin.add(rect);
            if (position) {
                expect(position.width).toBe(width);
                expect(position.height).toBe(height);
                rects.push(position);
            } else {
                break;
            }
        }

        expect(bin.width).toBeLessThanOrEqual(1024);
        expect(bin.height).toBeLessThanOrEqual(1024);

        rects.forEach(rect1 => {
            // Make sure rects are not overlapping
            rects.forEach(rect2 => {
                if (rect1 !== rect2) {
                    expect(rect1.collide(rect2)).toBe(false, "intersection detected: " + JSON.stringify(rect1) + " " + JSON.stringify(rect2));
                }
            });

            // Make sure no rect is outside bounds
            expect(rect1.x + rect1.width).toBeLessThanOrEqual(bin.width);
            expect(rect1.y + rect1.height).toBeLessThanOrEqual(bin.height);
        });
    });
})

let padding = 4;

describe("padding", () => {
    beforeEach(() => {
        bin = new MaxRectsBin(1024, 1024, padding, opt);
    });

    test("is initially empty", () => {
        expect(bin.width).toBe(0);
        expect(bin.height).toBe(0);
    })

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

    test("monkey testing", () => {
        // bin = new MaxRectsBin(1024, 1024, 40);
        let rects = [];
        while (true) {
            let width = Math.floor(Math.random() * 200);
            let height = Math.floor(Math.random() * 200);
            let rect = new Rectangle(width, height);

            let position = bin.add(rect);
            if (position) {
                expect(position.width).toBe(width);
                expect(position.height).toBe(height);
                rects.push(position);
            } else {
                break;
            }
        }

        expect(bin.width).toBeLessThanOrEqual(1024);
        expect(bin.height).toBeLessThanOrEqual(1024);

        rects.forEach(rect1 => {
            // Make sure rects are not overlapping
            rects.forEach(rect2 => {
                if (rect1 !== rect2) {
                    try {
                        expect(rect1.collide(rect2)).toBe(false); 
                    } catch (e) {
                        throw new Error("intersection detected: " + JSON.stringify(rect1) + " " + JSON.stringify(rect2));
                    }
                }
            });

            // Make sure no rect is outside bounds
            expect(rect1.x).toBeGreaterThanOrEqual(0);
            expect(rect1.y).toBeGreaterThanOrEqual(0);
            expect(rect1.x + rect1.width).toBeLessThanOrEqual(bin.width);
            expect(rect1.y + rect1.height).toBeLessThanOrEqual(bin.height);
        });
    });
});

padding = 4
let border = 5;

describe("border", () => {
    beforeEach(() => {
        const borderOpt = {...opt, ...{border: border, square: false}};
        bin = new MaxRectsBin(1024, 1024, padding, borderOpt);
    });

    test("is initially empty", () => {
        expect(bin.width).toBe(0);
        expect(bin.height).toBe(0);
    })

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

    let repeat = 5;
    test(`super monkey testing (${repeat} loop)`, () => {
        while (repeat > 0) {
            padding = Math.floor(Math.random() * 10);            
            border = Math.floor(Math.random() * 20);            
            const borderOpt = {...opt, ...{border: border, square: false}};
            bin = new MaxRectsBin(1024, 1024, padding, borderOpt);

            let rects = [];
            while (true) {
                let width = Math.floor(Math.random() * 200);
                let height = Math.floor(Math.random() * 200);
                let rect = new Rectangle(width, height);
    
                let position = bin.add(rect);
                if (position) {
                    expect(position.width).toBe(width);
                    expect(position.height).toBe(height);
                    rects.push(position);
                } else {
                    break;
                }
            }
    
            expect(bin.width).toBeLessThanOrEqual(1024);
            expect(bin.height).toBeLessThanOrEqual(1024);
    
            rects.forEach(rect1 => {
                // Make sure rects are not overlapping
                rects.forEach(rect2 => {
                    if (rect1 !== rect2) {
                        try {
                            expect(rect1.collide(rect2)).toBe(false); 
                        } catch (e) {
                            throw new Error("intersection detected: " + JSON.stringify(rect1) + " " + JSON.stringify(rect2));
                        }
                    }
                });
    
                // Make sure no rect is outside bounds
                expect(rect1.x).toBeGreaterThanOrEqual(bin.options.border);
                expect(rect1.y).toBeGreaterThanOrEqual(bin.options.border);
                expect(rect1.x + rect1.width).toBeLessThanOrEqual(bin.width - bin.options.border);
                expect(rect1.y + rect1.height).toBeLessThanOrEqual(bin.height - bin.options.border);
            });
            repeat --;
        }
    });
});
