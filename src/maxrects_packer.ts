import { Rectangle } from "./geom/Rectangle";
import { MaxRectsBin } from "./maxrects_bin";

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
export interface Option {
    smart?: boolean;
    pot?: boolean;
    square?: boolean;
}

export class MaxRectsPacker {
    public bins: MaxRectsBin[];

    /**
     * Creates an instance of MaxRectsPacker.
     * @param {number} width of the output atlas (default is 4096)
     * @param {number} height of the output atlas (default is 4096)
     * @param {number} padding between glyphs/images (default is 0)
     * @param {Option} [options={}] (Optional) packing options
     * @memberof MaxRectsPacker
     */
    constructor (
        public width: number = EDGE_MAX_VALUE,
        public height: number = EDGE_MAX_VALUE,
        public padding: number = 0,
        public options: Option = { smart: true, pot: true, square: true }
    ) {
        if (this.options.smart) this.options.smart = true;
        if (this.options.pot) this.options.pot = true;
        if (this.options.square) this.options.square = true;
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
            // TODO: OversizedElementBin
        } else {
            let added = this.bins.find(bin => bin.add(width, height, data) !== undefined);
            if (!added) {
                let bin = new MaxRectsBin(this.width, this.height, this.padding, this.options);
                bin.add(width, height, data);
                this.bins.push(bin);
            }
        }
    }

    private sort (rects: Rectangle[]) {
        return rects.slice().sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
    }
}
