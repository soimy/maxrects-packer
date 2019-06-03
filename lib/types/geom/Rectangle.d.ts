export interface IRectangle {
    width: number;
    height: number;
    x: number;
    y: number;
    [propName: string]: any;
}
export declare class Rectangle implements IRectangle {
    width: number;
    height: number;
    x: number;
    y: number;
    /**
     * Oversized tag on rectangle which is bigger than packer itself.
     *
     * @type {boolean}
     * @memberof Rectangle
     */
    oversized: boolean;
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
    constructor(width?: number, height?: number, x?: number, y?: number, rot?: boolean);
    /**
     * Test if two given rectangle collide each other
     *
     * @static
     * @param {Rectangle} first
     * @param {Rectangle} second
     * @returns
     * @memberof Rectangle
     */
    static Collide(first: Rectangle, second: Rectangle): boolean;
    /**
     * Test if the first rectangle contains the second one
     *
     * @static
     * @param {Rectangle} first
     * @param {Rectangle} second
     * @returns
     * @memberof Rectangle
     */
    static Contain(first: Rectangle, second: Rectangle): boolean;
    /**
     * Get the area (w * h) of the rectangle
     *
     * @returns {number}
     * @memberof Rectangle
     */
    area(): number;
    /**
     * Test if the given rectangle collide with this rectangle.
     *
     * @param {Rectangle} rect
     * @returns {boolean}
     * @memberof Rectangle
     */
    collide(rect: Rectangle): boolean;
    /**
     * Test if this rectangle contains the given rectangle.
     *
     * @param {Rectangle} rect
     * @returns {boolean}
     * @memberof Rectangle
     */
    contain(rect: Rectangle): boolean;
    private _rot;
    /**
     * If the rectangle is rotated
     *
     * @type {boolean}
     * @memberof Rectangle
     */
    /**
    * Set the rotate tag of the rectangle.
    *
    * note: after `rot` is set, `width/height` of this rectangle is swaped.
    *
    * @memberof Rectangle
    */
    rot: boolean;
    private _data;
    data: any;
}
