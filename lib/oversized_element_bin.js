"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rectangle_1 = require("./geom/Rectangle");
const abstract_bin_1 = require("./abstract_bin");
class OversizedElementBin extends abstract_bin_1.Bin {
    constructor(...args) {
        super();
        this.rects = [];
        if (args.length === 1 && typeof args[0] === 'object') {
            const rect = args[0];
            this.rects = [rect];
            this.width = rect.width;
            this.height = rect.height;
            this.data = rect.data;
            rect.oversized = true;
        }
        else {
            this.width = args[0];
            this.height = args[1];
            this.data = args.length > 2 ? args[2] : null;
            const rect = new Rectangle_1.Rectangle(0, 0, this.width, this.height);
            rect.oversized = true;
            rect.data = this.data;
            this.rects.push(rect);
        }
        this.freeRects = [];
        this.maxWidth = this.width;
        this.maxHeight = this.height;
        this.options = { smart: false, pot: false, square: false };
    }
    add() { return undefined; }
}
exports.OversizedElementBin = OversizedElementBin;
//# sourceMappingURL=oversized_element_bin.js.map