import { IRectangle } from "./geom/Rectangle";
import { IOption } from "./maxrects-packer";
export interface IBin {
    width: number;
    height: number;
    maxWidth: number;
    maxHeight: number;
    freeRects: IRectangle[];
    rects: IRectangle[];
    options: IOption;
    [propName: string]: any;
}
export declare abstract class Bin implements IBin {
    width: number;
    height: number;
    maxWidth: number;
    maxHeight: number;
    freeRects: IRectangle[];
    rects: IRectangle[];
    options: IOption;
    abstract add(rect: IRectangle): IRectangle | undefined;
    abstract add(width: number, height: number, data: any): IRectangle | undefined;
    /**
     * Check if the bin is dirty/changed
     *
     * @returns {boolean}
     * @memberof Bin
     */
    isDirty(): boolean;
    /**
     * Set bin dirty
     *
     * @memberof Bin
     */
    setDirty(): void;
    /**
     * Reset bin dirty status
     *
     * @memberof Bin
     */
    resetDirty(): void;
    data?: any;
    tag?: string;
    protected _dirty: number;
}
