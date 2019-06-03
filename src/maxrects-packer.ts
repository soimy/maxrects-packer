import { Rectangle, IRectangle } from "./geom/Rectangle";
import { MaxRectsBin } from "./maxrects-bin";
import { OversizedElementBin } from "./oversized-element-bin";
import { Bin, IBin } from "./abstract-bin";

export const EDGE_MAX_VALUE: number = 4096;
export const EDGE_MIN_VALUE: number = 128;

/**
 * Options for MaxRect Packer
 * @property {boolean} options.smart Smart sizing packer (default is true)
 * @property {boolean} options.pot use power of 2 sizing (default is true)
 * @property {boolean} options.square use square size (default is false)
 * @export
 * @interface Option
 */
export interface IOption {
    smart?: boolean;
    pot?: boolean;
    square?: boolean;
    allowRotation?: boolean;
}

export class MaxRectsPacker<T extends IRectangle = Rectangle> {

    /**
     * The Bin array added to the packer
     *
     * @type {Bin[]}
     * @memberof MaxRectsPacker
     */
    public bins: Bin[];

    /**
     * Creates an instance of MaxRectsPacker.
     * @param {number} width of the output atlas (default is 4096)
     * @param {number} height of the output atlas (default is 4096)
     * @param {number} padding between glyphs/images (default is 0)
     * @param {IOption} [options={}] (Optional) packing options
     * @memberof MaxRectsPacker
     */
    constructor (
        public width: number = EDGE_MAX_VALUE,
        public height: number = EDGE_MAX_VALUE,
        public padding: number = 0,
        public options: IOption = { smart: true, pot: true, square: true, allowRotation: false }
    ) {
        this.bins = [];
    }

    /**
     * Add a bin/rectangle object with data to packer
     * @param {number} width of the input bin/rectangle
     * @param {number} height of the input bin/rectangle
     * @param {*} data custom data object
     * @memberof MaxRectsPacker
     */
    public add (width: number, height: number, data: any): IRectangle;
    /**
     * Add a bin/rectangle object extends IRectangle to packer
     * @template T Generic type extends IRectangle interface
     * @param {T} rect the rect object add to the packer bin
     * @memberof MaxRectsPacker
     */
    public add (rect: T): T;
    public add (...args: any[]): any {
        let width: number;
        let height: number;
        let data: any;
        if (args.length === 1) {
            if (typeof args[0] !== 'object') throw new Error("MacrectsPacker.add(): Wrong parameters");
            const rect: T = args[0];
            if (rect.width > this.width || rect.height > this.height) {
                this.bins.push(new OversizedElementBin<T>(rect));
            } else {
                let added = this.bins.find(bin => bin.add(rect) !== undefined);
                if (!added) {
                    let bin = new MaxRectsBin<T>(this.width, this.height, this.padding, this.options);
                    bin.add(rect);
                    this.bins.push(bin);
                }
            }
        } else {
            width = args[0];
            height = args[1];
            data = args.length > 2 ? args[2] : null;
            if (width > this.width || height > this.height) {
                this.bins.push(new OversizedElementBin<T>(width, height, data));
            } else {
                let added = this.bins.find(bin => bin.add(width, height, data) !== undefined);
                if (!added) {
                    let bin = new MaxRectsBin<T>(this.width, this.height, this.padding, this.options);
                    bin.add(width, height, data);
                    this.bins.push(bin);
                }
            }
        }
    }

    /**
     * Add an Array of bins/rectangles to the packer.
     *
     * `Javascript`: Any object has property: { width, height, ... } is accepted.
     *
     * `Typescript`: object shall extends `MaxrectsPacker.IRectangle`.
     *
     * note: object has `hash` property will have more stable packing result
     *
     * @param {IRectangle[]} rects Array of bin/rectangles
     * @memberof MaxRectsPacker
     */
    public addArray (rects: T[]) {
        this.sort(rects).forEach(rect => this.add(rect));
    }

    /**
     * Load bins to the packer, overwrite exist bins
     * @param {MaxRectsBin[]} bins MaxRectsBin objects
     * @memberof MaxRectsPacker
     */
    public load (bins: Bin[]) {
        bins.forEach((bin, index) => {
            if (bin.maxWidth > this.width || bin.maxHeight > this.height) {
                this.bins.push(new OversizedElementBin(bin.width, bin.height, {}));
            } else {
                let newBin = new MaxRectsBin<T>(this.width, this.height, this.padding, bin.options);
                newBin.freeRects.splice(0);
                bin.freeRects.forEach((r, i) => {
                    newBin.freeRects.push(new Rectangle(r.width, r.height, r.x, r.y));
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
    public save (): IBin[] {
        let saveBins: IBin[] = [];
        this.bins.forEach((bin => {
            let saveBin: IBin = {
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

    /**
     * Sort the given rects based on longest edge
     *
     * If having same long edge, will sort second key `hash` if presented.
     *
     * @private
     * @param {T[]} rects
     * @returns
     * @memberof MaxRectsPacker
     */
    private sort (rects: T[]) {
        return rects.slice().sort((a, b) => {
            const result = Math.max(b.width, b.height) - Math.max(a.width, a.height);
            if (result === 0 && a.hash && b.hash) {
                return a.hash > b.hash ? 1 : -1;
            } else return result;
        });
    }
}
