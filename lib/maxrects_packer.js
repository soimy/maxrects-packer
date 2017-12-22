"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Rectangle_1 = require("./geom/Rectangle");
var maxrects_bin_1 = require("./maxrects_bin");
var oversized_element_bin_1 = require("./oversized_element_bin");
exports.EDGE_MAX_VALUE = 4096;
exports.EDGE_MIN_VALUE = 128;
var MaxRectsPacker = /** @class */ (function () {
    /**
     * Creates an instance of MaxRectsPacker.
     * @param {number} width of the output atlas (default is 4096)
     * @param {number} height of the output atlas (default is 4096)
     * @param {number} padding between glyphs/images (default is 0)
     * @param {IOption} [options={}] (Optional) packing options
     * @memberof MaxRectsPacker
     */
    function MaxRectsPacker(width, height, padding, options) {
        if (width === void 0) { width = exports.EDGE_MAX_VALUE; }
        if (height === void 0) { height = exports.EDGE_MAX_VALUE; }
        if (padding === void 0) { padding = 0; }
        if (options === void 0) { options = { smart: true, pot: true, square: true }; }
        this.width = width;
        this.height = height;
        this.padding = padding;
        this.options = options;
        this.bins = [];
    }
    /**
     * Add a bin/rectangle object with data to packer
     * @param {number} width of the input bin/rectangle
     * @param {number} height of the input bin/rectangle
     * @param {*} data custom data object
     * @memberof MaxRectsPacker
     */
    MaxRectsPacker.prototype.add = function (width, height, data) {
        if (width > this.width || height > this.height) {
            this.bins.push(new oversized_element_bin_1.OversizedElementBin(width, height, data));
        }
        else {
            var added = this.bins.find(function (bin) { return bin.add(width, height, data) !== undefined; });
            if (!added) {
                var bin = new maxrects_bin_1.MaxRectsBin(this.width, this.height, this.padding, this.options);
                bin.add(width, height, data);
                this.bins.push(bin);
            }
        }
    };
    /**
     * Add an Array of bins/rectangles to the packer.
     * Object structure: { width, height, data }
     * @param {IRectangle[]} rects Array of bin/rectangles
     * @memberof MaxRectsPacker
     */
    MaxRectsPacker.prototype.addArray = function (rects) {
        var _this = this;
        this.sort(rects).forEach(function (r) { return _this.add(r.width, r.height, r.data); });
    };
    /**
     * Load bins to the packer, overwrite exist bins
     * @param {MaxRectsBin[]} bins MaxRectsBin objects
     * @memberof MaxRectsPacker
     */
    MaxRectsPacker.prototype.load = function (bins) {
        var _this = this;
        bins.forEach(function (bin, index) {
            if (bin.maxWidth > _this.width || bin.maxHeight > _this.height) {
                _this.bins.push(new oversized_element_bin_1.OversizedElementBin(bin.width, bin.height, {}));
            }
            else {
                var newBin_1 = new maxrects_bin_1.MaxRectsBin(_this.width, _this.height, _this.padding, bin.options);
                newBin_1.freeRects.splice(0);
                bin.freeRects.forEach(function (r, i) {
                    newBin_1.freeRects.push(new Rectangle_1.Rectangle(r.x, r.y, r.width, r.height));
                });
                newBin_1.width = bin.width;
                newBin_1.height = bin.height;
                _this.bins[index] = newBin_1;
            }
        }, this);
    };
    /**
     * Output current bins to save
     * @memberof MaxRectsPacker
     */
    MaxRectsPacker.prototype.save = function () {
        var saveBins = [];
        this.bins.forEach((function (bin) {
            var saveBin = {
                width: bin.width,
                height: bin.height,
                maxWidth: bin.maxWidth,
                maxHeight: bin.maxHeight,
                freeRects: [],
                rects: [],
                options: bin.options
            };
            bin.freeRects.forEach(function (r) {
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
    };
    MaxRectsPacker.prototype.sort = function (rects) {
        return rects.slice().sort(function (a, b) { return Math.max(b.width, b.height) - Math.max(a.width, a.height); });
    };
    return MaxRectsPacker;
}());
exports.MaxRectsPacker = MaxRectsPacker;
//# sourceMappingURL=maxrects_packer.js.map