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

export abstract class Bin<T extends IRectangle> implements IBin {
    public width!: number;
    public height!: number;
    public maxWidth!: number;
    public maxHeight!: number;
    public freeRects!: IRectangle[];
    public rects!: T[];
    public options!: IOption;
    public abstract add (rect: T): T | undefined;
    public abstract add (width: number, height: number, data: any): T | undefined;
    public abstract reset (deepRest: boolean): void;
    public abstract repack (): T[] | undefined;

    public data?: any;
    public tag?: string;

    protected _dirty: number = 0;
    get dirty (): boolean { return this._dirty > 0 || this.rects.some(rect => rect.dirty); }
    /**
     * Set bin dirty status
     *
     * @memberof Bin
     */
    public setDirty (value: boolean = true): void {
        this._dirty = value ? this._dirty + 1 : 0;
        if (!value) {
            for (let rect of this.rects) {
                if (rect.setDirty) rect.setDirty(false);
            }
        }
    }

    public abstract clone (): Bin<T>;
}
