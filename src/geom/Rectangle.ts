export interface IRectangle {
    width: number
    height: number
    x: number
    y: number
    [propName: string]: any
}

export class Rectangle implements IRectangle {
    /**
     * Oversized tag on rectangle which is bigger than packer itself.
     */
    public oversized: boolean = false;

    /**
     * Creates an instance of Rectangle.
     *
     * @param width - width of the rectangle (default is 0)
     * @param height - height of the rectangle (default is 0)
     * @param x - x position of the rectangle (default is 0)
     * @param y - y position of the rectangle (default is 0)
     * @param rot - rotation flag (default is false)
     * @param allowRotation - allow rotation flag (default is undefined)
     */
    constructor (
        width: number = 0,
        height: number = 0,
        x: number = 0,
        y: number = 0,
        rot: boolean = false,
        allowRotation: boolean | undefined = undefined
    ) {
        this._width = width;
        this._height = height;
        this._x = x;
        this._y = y;
        this._data = {};
        this._rot = rot;
        this._allowRotation = allowRotation;
    }

    /**
     * Test if two given rectangle collide each other
     *
     * @param first - first rectangle
     * @param second - second rectangle
     * @returns true if rectangles collide
     */
    public static Collide (first: IRectangle, second: IRectangle) { return first.collide(second); }

    /**
     * Test if the first rectangle contains the second one
     *
     * @param first - first rectangle
     * @param second - second rectangle
     * @returns true if first rectangle contains the second
     */
    public static Contain (first: IRectangle, second: IRectangle) { return first.contain(second); }

    /**
     * Get the area (w * h) of the rectangle
     *
     * @returns The area of the rectangle
     */
    public area (): number { return this.width * this.height; }

    /**
     * Test if the given rectangle collide with this rectangle.
     *
     * @param rect - rectangle to test collision with
     * @returns true if rectangles collide
     */
    public collide (rect: IRectangle): boolean {
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
     * @param rect - rectangle to test containment
     * @returns true if this rectangle contains the given rectangle
     */
    public contain (rect: IRectangle): boolean {
        return (rect.x >= this.x && rect.y >= this.y &&
                rect.x + rect.width <= this.x + this.width && rect.y + rect.height <= this.y + this.height);
    }

    protected _width: number;
    get width (): number { return this._width; }
    set width (value: number) {
        if (value === this._width) return;
        this._width = value;
        this._dirty ++;
    }

    protected _height: number;
    get height (): number { return this._height; }
    set height (value: number) {
        if (value === this._height) return;
        this._height = value;
        this._dirty ++;
    }

    protected _x: number;
    get x (): number { return this._x; }
    set x (value: number) {
        if (value === this._x) return;
        this._x = value;
        this._dirty ++;
    }

    protected _y: number;
    get y (): number { return this._y; }
    set y (value: number) {
        if (value === this._y) return;
        this._y = value;
        this._dirty ++;
    }

    protected _rot: boolean = false;

    /**
     * If the rectangle is rotated
     */
    get rot (): boolean { return this._rot; }

    /**
     * Set the rotate tag of the rectangle.
     *
     * note: after `rot` is set, `width/height` of this rectangle is swaped.
     */
    set rot (value: boolean) {
        if (this._allowRotation === false) return;

        if (this._rot !== value) {
            const tmp = this.width;
            this.width = this.height;
            this.height = tmp;
            this._rot = value;
            this._dirty ++;
        }
    }

    protected _allowRotation: boolean | undefined = undefined;

    /**
     * If the rectangle allow rotation
     */
    get allowRotation (): boolean | undefined { return this._allowRotation; }

    /**
     * Set the allowRotation tag of the rectangle.
     */
    set allowRotation (value: boolean | undefined) {
        if (this._allowRotation !== value) {
            this._allowRotation = value;
            this._dirty ++;
        }
    }

    protected _data: any;
    get data (): any { return this._data; }
    set data (value: any) {
        if (value === null || value === this._data) return;
        this._data = value;
        // extract allowRotation settings
        if (typeof value === "object" && value.hasOwnProperty("allowRotation")) {
            this._allowRotation = value.allowRotation;
        }
        this._dirty ++;
    }

    protected _dirty: number = 0;
    get dirty (): boolean { return this._dirty > 0; }
    public setDirty (value: boolean = true): void { this._dirty = value ? this._dirty + 1 : 0; }
}
