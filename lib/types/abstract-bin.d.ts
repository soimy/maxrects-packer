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
    data?: any;
    tag?: string;
    protected _dirty: number;
    readonly dirty: boolean;
    /**
     * Set bin dirty status
     *
     * @memberof Bin
     */
    setDirty(value?: boolean): void;
}
