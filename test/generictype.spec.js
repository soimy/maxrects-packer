let MaxRectsPacker = require('../src/maxrects-packer').MaxRectsPacker;
let Rectangle = require('../src/geom/Rectangle').Rectangle;

class Block extends Rectangle {
    constructor (_width = 0, _height = 0, _x = 0, _y = 0, _rot = false) {
        super();
        this.color = 0xffffffff; // Extended attribution
    }
    getColor () { // Extended method
        return this.color;
    }
}

let packer;
beforeEach(() => {
    packer = new MaxRectsPacker(1024, 1024, 0);
});

test('generic type extends Rectangle class', () => {
    let blocks = [];
    blocks.push(new Block(512, 512));
    blocks.push(new Block(512, 512));
    blocks.push(new Block(512, 512));
    let colors = [0x000000ff, 0xff0000ff];
    colors.forEach((color, i) => {
        blocks[i].color = color;
    });

    packer.addArray(blocks);
    expect(packer.bins.length).toBe(1);
    expect(packer.bins[0].rects.length).toBe(blocks.length);
    expect(packer.bins[0].rects[0].x).toBe(0);
    expect(packer.bins[0].rects[0].y).toBe(0);
    expect(packer.bins[0].rects[0].color).toBe(colors[0]);
    expect(packer.bins[0].rects[0].getColor()).toBe(colors[0]);
    expect(packer.bins[0].rects[2].color).toBe(0xffffffff);
});

test('anonymous class with width, height', () => {
    let blocks = [];
    blocks.push({width: 512, height: 512});
    blocks.push({width: 512, height: 512});
    blocks.push({width: 512, height: 512});
    let colors = [0x000000ff, 0xff0000ff];
    colors.forEach((color, i) => {
        blocks[i].color = color;
    });

    packer.addArray(blocks);
    expect(packer.bins.length).toBe(1);
    expect(packer.bins[0].rects.length).toBe(blocks.length);
    expect(packer.bins[0].rects[0].x).toBe(0);
    expect(packer.bins[0].rects[0].y).toBe(0);
    expect(packer.bins[0].rects[0].color).toBe(colors[0]);
    expect(packer.bins[0].rects[2].color).toBeUndefined();
});
