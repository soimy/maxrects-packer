import { IRectangle } from "./geom/Rectangle";
import { IOption } from "./maxrects_packer";
export interface IBin {
    width: number;
    height: number;
    maxWidth: number;
    maxHeight: number;
    freeRects: IRectangle[];
    rects: IRectangle[];
    options: IOption;
}
export declare abstract class Bin implements IBin {
    width: number;
    height: number;
    maxWidth: number;
    maxHeight: number;
    freeRects: IRectangle[];
    rects: IRectangle[];
    options: IOption;
    abstract add(width: number, height: number, data: any): IRectangle | undefined;
}
