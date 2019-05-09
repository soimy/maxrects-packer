import { IRectangle } from "./geom/Rectangle";
import { Bin, IBin } from "./abstract_bin";
export declare const EDGE_MAX_VALUE: number;
export declare const EDGE_MIN_VALUE: number;
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
export declare class MaxRectsPacker {
    width: number;
    height: number;
    padding: number;
    options: IOption;
    bins: Bin[];
    /**
     * Creates an instance of MaxRectsPacker.
     * @param {number} width of the output atlas (default is 4096)
     * @param {number} height of the output atlas (default is 4096)
     * @param {number} padding between glyphs/images (default is 0)
     * @param {IOption} [options={}] (Optional) packing options
     * @memberof MaxRectsPacker
     */
    constructor(width?: number, height?: number, padding?: number, options?: IOption);
    /**
     * Add a bin/rectangle object with data to packer
     * @param {number} width of the input bin/rectangle
     * @param {number} height of the input bin/rectangle
     * @param {*} data custom data object
     * @memberof MaxRectsPacker
     */
    add(width: number, height: number, data: any): void;
    /**
     * Add an Array of bins/rectangles to the packer.
     * Object structure: { width, height, data }
     * @param {IRectangle[]} rects Array of bin/rectangles
     * @memberof MaxRectsPacker
     */
    addArray(rects: IRectangle[]): void;
    /**
     * Load bins to the packer, overwrite exist bins
     * @param {MaxRectsBin[]} bins MaxRectsBin objects
     * @memberof MaxRectsPacker
     */
    load(bins: IBin[]): void;
    /**
     * Output current bins to save
     * @memberof MaxRectsPacker
     */
    save(): IBin[];
    private sort;
}
