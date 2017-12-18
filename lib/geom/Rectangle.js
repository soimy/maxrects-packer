"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Rectangle {
    constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.data = {};
    }
    static Collide(first, second) { return first.collide(second); }
    static Contain(first, second) { return first.contain(second); }
    area() { return this.width * this.height; }
    collide(rect) {
        return (rect.x >= this.x + this.width || rect.x + rect.width <= this.x ||
            rect.y >= this.y + this.height || rect.y + rect.height <= this.y);
    }
    contain(rect) {
        return (rect.x >= this.x && rect.y >= this.y &&
            rect.x + rect.width <= this.x + this.width && rect.y + rect.height <= this.y + this.width);
    }
}
exports.Rectangle = Rectangle;
//# sourceMappingURL=Rectangle.js.map