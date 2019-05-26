import { Rectangle } from "./geom/Rectangle";
import { Bin } from "./abstract-bin";
export class OversizedElementBin extends Bin {
    constructor(...args) {
        super();
        this.rects = [];
        if (args.length === 1) {
            if (typeof args[0] !== 'object')
                throw new Error("OversizedElementBin: Wrong parameters");
            const rect = args[0];
            this.rects = [rect];
            this.width = rect.width;
            this.height = rect.height;
            this.data = rect.data;
            rect.oversized = true;
        }
        else {
            this.width = args[0];
            this.height = args[1];
            this.data = args.length > 2 ? args[2] : null;
            const rect = new Rectangle(this.width, this.height);
            rect.oversized = true;
            rect.data = this.data;
            this.rects.push(rect);
        }
        this.freeRects = [];
        this.maxWidth = this.width;
        this.maxHeight = this.height;
        this.options = { smart: false, pot: false, square: false };
    }
    add() { return undefined; }
}
//# sourceMappingURL=oversized-element-bin.js.map