"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Rectangle_1 = require("./geom/Rectangle");
const maxrects_bin_1 = require("./maxrects-bin");
const oversized_element_bin_1 = require("./oversized-element-bin");
exports.EDGE_MAX_VALUE = 4096;
exports.EDGE_MIN_VALUE = 128;
var Rectangle_2 = require("./geom/Rectangle");
exports.Rectangle = Rectangle_2.Rectangle;
class MaxRectsPacker {
    /**
     * Creates an instance of MaxRectsPacker.
     * @param {number} width of the output atlas (default is 4096)
     * @param {number} height of the output atlas (default is 4096)
     * @param {number} padding between glyphs/images (default is 0)
     * @param {IOption} [options={}] (Optional) packing options
     * @memberof MaxRectsPacker
     */
    constructor(width = exports.EDGE_MAX_VALUE, height = exports.EDGE_MAX_VALUE, padding = 0, options = { smart: true, pot: true, square: true, allowRotation: false }) {
        this.width = width;
        this.height = height;
        this.padding = padding;
        this.options = options;
        this.bins = [];
    }
    add(...args) {
        let width;
        let height;
        let data;
        if (args.length === 1) {
            if (typeof args[0] !== 'object')
                throw new Error("MacrectsPacker.add(): Wrong parameters");
            const rect = args[0];
            if (rect.width > this.width || rect.height > this.height) {
                this.bins.push(new oversized_element_bin_1.OversizedElementBin(rect));
            }
            else {
                let added = this.bins.find(bin => bin.add(rect) !== undefined);
                if (!added) {
                    let bin = new maxrects_bin_1.MaxRectsBin(this.width, this.height, this.padding, this.options);
                    bin.add(rect);
                    this.bins.push(bin);
                }
            }
        }
        else {
            width = args[0];
            height = args[1];
            data = args.length > 2 ? args[2] : null;
            if (width > this.width || height > this.height) {
                this.bins.push(new oversized_element_bin_1.OversizedElementBin(width, height, data));
            }
            else {
                let added = this.bins.find(bin => bin.add(width, height, data) !== undefined);
                if (!added) {
                    let bin = new maxrects_bin_1.MaxRectsBin(this.width, this.height, this.padding, this.options);
                    bin.add(width, height, data);
                    this.bins.push(bin);
                }
            }
        }
    }
    /**
     * Add an Array of bins/rectangles to the packer.
     * Object structure: { width, height, data }
     * @param {IRectangle[]} rects Array of bin/rectangles
     * @memberof MaxRectsPacker
     */
    addArray(rects) {
        this.sort(rects).forEach(rect => this.add(rect));
    }
    /**
     * Load bins to the packer, overwrite exist bins
     * @param {MaxRectsBin[]} bins MaxRectsBin objects
     * @memberof MaxRectsPacker
     */
    load(bins) {
        bins.forEach((bin, index) => {
            if (bin.maxWidth > this.width || bin.maxHeight > this.height) {
                this.bins.push(new oversized_element_bin_1.OversizedElementBin(bin.width, bin.height, {}));
            }
            else {
                let newBin = new maxrects_bin_1.MaxRectsBin(this.width, this.height, this.padding, bin.options);
                newBin.freeRects.splice(0);
                bin.freeRects.forEach((r, i) => {
                    newBin.freeRects.push(new Rectangle_1.Rectangle(r.width, r.height, r.x, r.y));
                });
                newBin.width = bin.width;
                newBin.height = bin.height;
                this.bins[index] = newBin;
            }
        }, this);
    }
    /**
     * Output current bins to save
     * @memberof MaxRectsPacker
     */
    save() {
        let saveBins = [];
        this.bins.forEach((bin => {
            let saveBin = {
                width: bin.width,
                height: bin.height,
                maxWidth: bin.maxWidth,
                maxHeight: bin.maxHeight,
                freeRects: [],
                rects: [],
                options: bin.options
            };
            bin.freeRects.forEach(r => {
                saveBin.freeRects.push({
                    x: r.x,
                    y: r.y,
                    width: r.width,
                    height: r.height
                });
            });
            saveBins.push(saveBin);
        }));
        return saveBins;
    }
    sort(rects) {
        return rects.slice().sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
    }
}
exports.MaxRectsPacker = MaxRectsPacker;
//# sourceMappingURL=maxrects-packer.js.map