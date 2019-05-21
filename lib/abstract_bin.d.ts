import { IRectangle, Rectangle } from "./geom/Rectangle";
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
export declare abstract class Bin<T extends IRectangle = Rectangle> implements IBin {
    width: number;
    height: number;
    maxWidth: number;
    maxHeight: number;
    freeRects: IRectangle[];
    rects: T[];
    options: IOption;
    abstract add(rect: T): T | undefined;
    abstract add(width: number, height: number, data: any): IRectangle | undefined;
}
