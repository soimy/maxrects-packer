export class Rectangle {
    constructor(width = 0, height = 0, x = 0, y = 0, rot = false) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.oversized = false;
        this._rot = false;
        this.data = {};
        this.rot = rot;
    }
    static Collide(first, second) { return first.collide(second); }
    static Contain(first, second) { return first.contain(second); }
    area() { return this.width * this.height; }
    collide(rect) {
        return (rect.x < this.x + this.width &&
            rect.x + rect.width > this.x &&
            rect.y < this.y + this.height &&
            rect.y + rect.height > this.y);
    }
    contain(rect) {
        return (rect.x >= this.x && rect.y >= this.y &&
            rect.x + rect.width <= this.x + this.width && rect.y + rect.height <= this.y + this.height);
    }
    get rot() { return this._rot; }
    set rot(value) {
        if (this._rot && value)
            return;
        if (this._rot !== value) {
            const tmp = this.width;
            this.width = this.height;
            this.height = tmp;
            this._rot = value;
        }
    }
    get data() { return this._data; }
    set data(value) { this._data = value; }
}
//# sourceMappingURL=Rectangle.js.map