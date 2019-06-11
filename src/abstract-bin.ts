import { IRectangle, Rectangle } from "./geom/Rectangle";
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

export abstract class Bin implements IBin {
    public width!: number;
    public height!: number;
    public maxWidth!: number;
    public maxHeight!: number;
    public freeRects!: IRectangle[];
    public rects!: IRectangle[];
    public options!: IOption;
    public abstract add (rect: IRectangle): IRectangle | undefined;
    public abstract add (width: number, height: number, data: any): IRectangle | undefined;

    /**
     * Check if the bin is dirty/changed
     *
     * @returns {boolean}
     * @memberof Bin
     */
    public isDirty (): boolean {
        return this._dirty > 0;
    }

    /**
     * Set bin dirty
     *
     * @memberof Bin
     */
    public setDirty (): void {
        this._dirty ++;
    }

    /**
     * Reset bin dirty status
     *
     * @memberof Bin
     */
    public resetDirty (): void {
        this._dirty = 0;
    }
    public data?: any;
    public tag?: string;

    protected _dirty: number = 0;
}
