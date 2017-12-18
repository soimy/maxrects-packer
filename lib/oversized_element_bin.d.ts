import { IRectangle } from "./geom/Rectangle";
import { IOption } from "./maxrects_packer";
import { Bin } from "./abstract_bin";
export default class OversizedElementBin extends Bin {
    width: number;
    height: number;
    data: any;
    maxWidth: number;
    maxHeight: number;
    options: IOption;
    rects: IRectangle[];
    freeRects: IRectangle[];
    constructor(width: number, height: number, data: any);
    add(): undefined;
}
