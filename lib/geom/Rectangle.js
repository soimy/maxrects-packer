"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Rectangle = /** @class */ (function () {
    function Rectangle(x, y, width, height) {
        if (x === void 0) { x = 0; }
        if (y === void 0) { y = 0; }
        if (width === void 0) { width = 0; }
        if (height === void 0) { height = 0; }
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.data = {};
    }
    Rectangle.Collide = function (first, second) { return first.collide(second); };
    Rectangle.Contain = function (first, second) { return first.contain(second); };
    Rectangle.prototype.area = function () { return this.width * this.height; };
    Rectangle.prototype.collide = function (rect) {
        return (rect.x >= this.x + this.width || rect.x + rect.width <= this.x ||
            rect.y >= this.y + this.height || rect.y + rect.height <= this.y);
    };
    Rectangle.prototype.contain = function (rect) {
        return (rect.x >= this.x && rect.y >= this.y &&
            rect.x + rect.width <= this.x + this.width && rect.y + rect.height <= this.y + this.width);
    };
    return Rectangle;
}());
exports.Rectangle = Rectangle;
//# sourceMappingURL=Rectangle.js.map