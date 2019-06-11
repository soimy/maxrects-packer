import { IOption } from "./maxrects-packer";
import { Rectangle, IRectangle } from "./geom/Rectangle";
import { Bin } from "./abstract-bin";
export declare class MaxRectsBin<T extends IRectangle = Rectangle> extends Bin {
    maxWidth: number;
    maxHeight: number;
    padding: number;
    options: IOption;
    width: number;
    height: number;
    freeRects: Rectangle[];
    rects: IRectangle[];
    private verticalExpand;
    private stage;
    private border;
    constructor(maxWidth?: number, maxHeight?: number, padding?: number, options?: IOption);
    add(rect: T): T | undefined;
    add(width: number, height: number, data: any): Rectangle | undefined;
    private findNode;
    private splitNode;
    private pruneFreeList;
    private updateBinSize;
    private expandFreeRects;
}
