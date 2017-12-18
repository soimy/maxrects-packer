import { IOption } from "./maxrects_packer";
import { Rectangle } from "./geom/Rectangle";
import { Bin } from "./abstract_bin";
export default class MaxRectsBin extends Bin {
    maxWidth: number;
    maxHeight: number;
    padding: number;
    options: IOption;
    width: number;
    height: number;
    freeRects: Rectangle[];
    rects: Rectangle[];
    private verticalExpand;
    constructor(maxWidth?: number, maxHeight?: number, padding?: number, options?: IOption);
    add(width: number, height: number, data: any): Rectangle | undefined;
    private findNode(width, height);
    private splitNode(freeRect, usedNode);
    private pruneFreeList();
    private updateBinSize(node);
    private expandFreeRects(width, height);
}
