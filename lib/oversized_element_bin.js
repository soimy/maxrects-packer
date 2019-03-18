"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const abstract_bin_1 = require("./abstract_bin");
class OversizedElementBin extends abstract_bin_1.Bin {
    constructor(width, height, data) {
        super();
        this.width = width;
        this.height = height;
        this.data = data;
        this.rects = [{
                x: 0,
                y: 0,
                width: this.width,
                height: this.height,
                data: data,
                oversized: true
            }];
        this.freeRects = [];
        this.maxWidth = width;
        this.maxHeight = height;
        this.options = { smart: false, pot: false, square: false };
    }
    add() { return undefined; }
}
exports.OversizedElementBin = OversizedElementBin;
//# sourceMappingURL=oversized_element_bin.js.map