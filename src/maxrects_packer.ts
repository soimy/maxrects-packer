export const EDGE_MAX_VALUE: number = 4096;
export const EDGE_MIN_VALUE: number = 128;

/**
 * Options for MaxRect Packer
 * @property {boolean} options.smart Smart sizing packer (default is true)
 * @property {boolean} options.pot use power of 2 sizing (default is true)
 * @property {boolean} options.square use square size (default is false)
 *
 * @export
 * @interface Option
 */
export interface Option {
    smart?: boolean;
    pot?: boolean;
    square?: boolean;
}

export class MaxRectsPacker {
    public maxWidth: number;
    public maxHeight: number;

    /**
     * Creates an instance of MaxRectsPacker.
     * @param {number} width of the output atlas (default is 4096)
     * @param {number} height of the output atlas (default is 4096)
     * @param {number} padding between glyphs/images (default is 0)
     * @param {Option} [options={}] (Optional) packing options
     * @memberof MaxRectsPacker
     */
    constructor (public width: number, public height: number, public padding: number, public options: Option = {}) {
        if (this.options.smart) this.options.smart = true;
        if (this.options.pot) this.options.pot = true;
        if (this.options.square) this.options.square = true;
    }
}
