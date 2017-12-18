"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var abstract_bin_1 = require("./abstract_bin");
var OversizedElementBin = /** @class */ (function (_super) {
    __extends(OversizedElementBin, _super);
    function OversizedElementBin(width, height, data) {
        var _this = _super.call(this) || this;
        _this.width = width;
        _this.height = height;
        _this.data = data;
        _this.rects = [{
                x: 0,
                y: 0,
                width: _this.width,
                height: _this.height,
                data: data,
                oversized: true
            }];
        _this.freeRects = [];
        _this.maxWidth = width;
        _this.maxHeight = height;
        _this.options = { smart: false, pot: false, square: false };
        return _this;
    }
    OversizedElementBin.prototype.add = function () { return undefined; };
    return OversizedElementBin;
}(abstract_bin_1.Bin));
exports.default = OversizedElementBin;
//# sourceMappingURL=oversized_element_bin.js.map