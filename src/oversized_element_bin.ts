import { IRectangle } from "./geom/Rectangle";
import { IOption } from "./maxrects_packer";
import { Bin } from "./abstract_bin";

export class OversizedElementBin extends Bin {
    public maxWidth: number;
    public maxHeight: number;
    public options: IOption;
    public rects: IRectangle[];
    public freeRects: IRectangle[];

    constructor (public width: number, public height: number, public data: any) {
        super();
        this.rects = [{
            x: 0,
            y: 0,
            width: this.width,
            height: this.height,
            data: data,
            oversized: true
        }];
        this.freeRects = [];
        this.maxWidth = width;
        this.maxHeight = height;
        this.options = { smart: false, pot: false, square: false };
    }

    add () { return undefined; }
}
