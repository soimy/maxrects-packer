export class Rectangle {
    /**
     * Creates an instance of Rectangle.
     *
     * @param {number} [width=0]
     * @param {number} [height=0]
     * @param {number} [x=0]
     * @param {number} [y=0]
     * @param {boolean} [rot=false]
     * @memberof Rectangle
     */
    constructor(width = 0, height = 0, x = 0, y = 0, rot = false) {
        /**
         * Oversized tag on rectangle which is bigger than packer itself.
         *
         * @type {boolean}
         * @memberof Rectangle
         */
        this.oversized = false;
        this._rot = false;
        this._dirty = 0;
        this._width = width;
        this._height = height;
        this._x = x;
        this._y = y;
        this._data = {};
        this._rot = rot;
    }
    /**
     * Test if two given rectangle collide each other
     *
     * @static
     * @param {Rectangle} first
     * @param {Rectangle} second
     * @returns
     * @memberof Rectangle
     */
    static Collide(first, second) { return first.collide(second); }
    /**
     * Test if the first rectangle contains the second one
     *
     * @static
     * @param {Rectangle} first
     * @param {Rectangle} second
     * @returns
     * @memberof Rectangle
     */
    static Contain(first, second) { return first.contain(second); }
    /**
     * Get the area (w * h) of the rectangle
     *
     * @returns {number}
     * @memberof Rectangle
     */
    area() { return this.width * this.height; }
    /**
     * Test if the given rectangle collide with this rectangle.
     *
     * @param {Rectangle} rect
     * @returns {boolean}
     * @memberof Rectangle
     */
    collide(rect) {
        return (rect.x < this.x + this.width &&
            rect.x + rect.width > this.x &&
            rect.y < this.y + this.height &&
            rect.y + rect.height > this.y);
    }
    /**
     * Test if this rectangle contains the given rectangle.
     *
     * @param {Rectangle} rect
     * @returns {boolean}
     * @memberof Rectangle
     */
    contain(rect) {
        return (rect.x >= this.x && rect.y >= this.y &&
            rect.x + rect.width <= this.x + this.width && rect.y + rect.height <= this.y + this.height);
    }
    get width() { return this._width; }
    set width(value) {
        if (value === this._width)
            return;
        this._width = value;
        this._dirty++;
    }
    get height() { return this._height; }
    set height(value) {
        if (value === this._height)
            return;
        this._height = value;
        this._dirty++;
    }
    get x() { return this._x; }
    set x(value) {
        if (value === this._x)
            return;
        this._x = value;
        this._dirty++;
    }
    get y() { return this._y; }
    set y(value) {
        if (value === this._y)
            return;
        this._y = value;
        this._dirty++;
    }
    /**
     * If the rectangle is rotated
     *
     * @type {boolean}
     * @memberof Rectangle
     */
    get rot() { return this._rot; }
    /**
     * Set the rotate tag of the rectangle.
     *
     * note: after `rot` is set, `width/height` of this rectangle is swaped.
     *
     * @memberof Rectangle
     */
    set rot(value) {
        if (this._rot && value)
            return;
        if (this._rot !== value) {
            const tmp = this.width;
            this.width = this.height;
            this.height = tmp;
            this._rot = value;
            this._dirty++;
        }
    }
    get data() { return this._data; }
    set data(value) {
        if (value === this._data)
            return;
        this._data = value;
        this._dirty++;
    }
    get dirty() { return this._dirty > 0; }
    setDirty(value = true) { this._dirty = value ? this._dirty + 1 : 0; }
}
//# sourceMappingURL=Rectangle.js.map