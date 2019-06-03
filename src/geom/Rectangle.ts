export interface IRectangle {
    width: number;
    height: number;
    x: number;
    y: number;
    [propName: string]: any;
}

export class Rectangle implements IRectangle {
    /**
     * Oversized tag on rectangle which is bigger than packer itself.
     *
     * @type {boolean}
     * @memberof Rectangle
     */
    public oversized: boolean = false;

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
    constructor (
        public width: number = 0,
        public height: number = 0,
        public x: number = 0,
        public y: number = 0,
        rot: boolean = false
    ) {
        this.data = {};
        this.rot = rot;
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
    public static Collide (first: Rectangle, second: Rectangle) { return first.collide(second); }

    /**
     * Test if the first rectangle contains the second one
     *
     * @static
     * @param {Rectangle} first
     * @param {Rectangle} second
     * @returns
     * @memberof Rectangle
     */
    public static Contain (first: Rectangle, second: Rectangle) { return first.contain(second); }

    /**
     * Get the area (w * h) of the rectangle
     *
     * @returns {number}
     * @memberof Rectangle
     */
    public area (): number { return this.width * this.height; }

    /**
     * Test if the given rectangle collide with this rectangle.
     *
     * @param {Rectangle} rect
     * @returns {boolean}
     * @memberof Rectangle
     */
    public collide (rect: Rectangle): boolean {
        return (
            rect.x < this.x + this.width &&
            rect.x + rect.width > this.x &&
            rect.y < this.y + this.height &&
            rect.y + rect.height > this.y
        );
    }

    /**
     * Test if this rectangle contains the given rectangle.
     *
     * @param {Rectangle} rect
     * @returns {boolean}
     * @memberof Rectangle
     */
    public contain (rect: Rectangle): boolean {
        return (rect.x >= this.x && rect.y >= this.y &&
                rect.x + rect.width <= this.x + this.width && rect.y + rect.height <= this.y + this.height);
    }

    private _rot: boolean = false;

    /**
     * If the rectangle is rotated
     *
     * @type {boolean}
     * @memberof Rectangle
     */
    get rot (): boolean { return this._rot; }

    /**
     * Set the rotate tag of the rectangle.
     *
     * note: after `rot` is set, `width/height` of this rectangle is swaped.
     *
     * @memberof Rectangle
     */
    set rot (value: boolean) {
        if (this._rot && value) return;
        if (this._rot !== value) {
            const tmp = this.width;
            this.width = this.height;
            this.height = tmp;
            this._rot = value;
        }
    }

    private _data: any;
    get data (): any { return this._data; }
    set data (value: any) { this._data = value; }

}
