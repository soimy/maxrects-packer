import { IRectangle, Rectangle } from "./geom/Rectangle";
import { IOption } from "./maxrects_packer";
import { Bin } from "./abstract_bin";
export declare class OversizedElementBin<T extends Rectangle> extends Bin {
    width: number;
    height: number;
    data: any;
    maxWidth: number;
    maxHeight: number;
    options: IOption;
    rects: T[];
    freeRects: IRectangle[];
    constructor(rect: IRectangle);
    constructor(width: number, height: number, data: any);
    add(): undefined;
}
