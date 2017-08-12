"use strict";

module.exports = class OversizedElementBin {
    constructor(width, height, data) {
        this.rects = [{x: 0, y: 0, width, height, data, oversized: true}];
        this.width = width;
        this.height = height;
    }

    add() {
        return undefined;
    }
}