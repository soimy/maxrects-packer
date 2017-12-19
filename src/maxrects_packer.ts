import { Rectangle, IRectangle } from "./geom/Rectangle";
import { MaxRectsBin } from "./maxrects_bin";
import { OversizedElementBin } from "./oversized_element_bin";
import { Bin, IBin } from "./abstract_bin";

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
}

export class MaxRectsPacker {
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
        public options: IOption = { smart: true, pot: true, square: true }
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
    public add (width: number, height: number, data: any) {
        if (width > this.width || height > this.height) {
            this.bins.push(new OversizedElementBin(width, height, data));
        } else {
            let added = this.bins.find(bin => bin.add(width, height, data) !== undefined);
            if (!added) {
                let bin = new MaxRectsBin(this.width, this.height, this.padding, this.options);
                bin.add(width, height, data);
                this.bins.push(bin);
            }
        }
    }

    /**
     * Add an Array of bins/rectangles to the packer.
     * Object structure: { width, height, data }
     * @param {IRectangle[]} rects Array of bin/rectangles
     * @memberof MaxRectsPacker
     */
    public addArray (rects: IRectangle[]) {
        this.sort(rects).forEach(r => this.add(r.width, r.height, r.data));
    }

    /**
     * Load bins to the packer, overwrite exist bins
     * @param {MaxRectsBin[]} bins MaxRectsBin objects
     * @memberof MaxRectsPacker
     */
    public load (bins: IBin[]) {
        bins.forEach((bin, index) => {
            if (bin.maxWidth > this.width || bin.maxHeight > this.height) {
                this.bins.push(new OversizedElementBin(bin.width, bin.height, {}));
            } else {
                let newBin = new MaxRectsBin(this.width, this.height, this.padding, bin.options);
                // newBin.freeRects = bin.freeRects;
                bin.freeRects.forEach(r => {
                    newBin.freeRects.push(new Rectangle(r.x, r.y, r.width, r.height));
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

    private sort (rects: IRectangle[]) {
        return rects.slice().sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
    }
}
