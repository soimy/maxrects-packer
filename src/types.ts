export const EDGE_MAX_VALUE: number = 4096;
export const EDGE_MIN_VALUE: number = 128;

export enum PACKING_LOGIC {
    MAX_AREA = 0,
    MAX_EDGE = 1,
    FILL_WIDTH = 2,
}

/**
 * Options for MaxRect Packer
 *
 * @property {boolean} smart - Smart sizing packer (default is true)
 * @property {boolean} pot - use power of 2 sizing (default is true)
 * @property {boolean} square - use square size (default is false)
 * @property {boolean} allowRotation - allow rotation packing (default is false)
 * @property {boolean} tag - allow auto grouping based on `rect.tag` (default is false)
 * @property {boolean} exclusiveTag - tagged rects will have dependent bin, if set to `false`, packer will try to put tag rects into the same bin (default is true)
 * @property {number} border - atlas edge spacing (default is 0)
 * @property {PACKING_LOGIC} logic - MAX_AREA or MAX_EDGE based sorting logic (default is MAX_EDGE)
 */
export interface IOption {
    smart?: boolean
    pot?: boolean
    square?: boolean
    allowRotation?: boolean
    tag?: boolean
    exclusiveTag?: boolean
    border?: number
    logic?: PACKING_LOGIC
}
