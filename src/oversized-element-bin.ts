import { IRectangle, Rectangle } from "./geom/Rectangle";
import { IOption } from "./types";
import { Bin } from "./abstract-bin";

export class OversizedElementBin<T extends IRectangle = Rectangle> extends Bin<T> {
    public width: number;
    public height: number;
    public data: any;
    public maxWidth: number;
    public maxHeight: number;
    public options: IOption;
    public rects: T[] = [];
    public freeRects: IRectangle[];

    /**
     * Build a placeholder bin around an existing rect: the rect is kept as-is, flagged `oversized`, and
     * its data becomes the bin's data.
     * @param rect - the rect to hold, which must be an object
     */
    constructor(rect: T);
    /**
     * Build a placeholder bin for an element that does not exist as a rect yet.
     * @param width - width of the element
     * @param height - height of the element
     * @param data - data attached to the element; optional, because the runtime has always accepted a
     * two-argument construction and the bin then reports `data: null`
     */
    constructor(width: number, height: number, data?: any);
    constructor(...args: any[]) {
        super();
        if (args.length === 1) {
            if (typeof args[0] !== "object") throw new Error("OversizedElementBin: Wrong parameters");
            const rect = args[0];
            this.rects = [rect];
            this.width = rect.width;
            this.height = rect.height;
            this.data = rect.data;
            rect.oversized = true;
        } else {
            this.width = args[0];
            this.height = args[1];
            // A two-argument construction is supported (and declared, so TypeScript callers can use it):
            // leaving `data` out keeps the original `null` rather than falling through to `undefined`.
            this.data = args.length > 2 ? args[2] : null;
            const rect: IRectangle = new Rectangle(this.width, this.height);
            rect.oversized = true;
            rect.data = this.data;
            this.rects.push(rect as T);
        }
        this.freeRects = [];
        this.maxWidth = this.width;
        this.maxHeight = this.height;
        this.options = { smart: false, pot: false, square: false };
    }

    add() {
        return undefined;
    }
    reset(_deepReset: boolean = false): void {
        // nothing to do here
    }
    repack(): T[] | undefined {
        return undefined;
    }
    /**
     * Copy this bin around a copy of its rect, so mutating one bin's rect leaves the other's alone. The
     * copy is shallow (`Rectangle.Clone`), so a payload stored in `rect.data` is still shared, and a rect
     * class that cannot be copied that way reports it from there.
     *
     * @returns a bin holding a copy of the same rect, with the same size, data and tag
     */
    clone(): Bin<T> {
        let clonedBin: OversizedElementBin<T> = new OversizedElementBin<T>(Rectangle.Clone(this.rects[0]));
        clonedBin.tag = this.tag;
        return clonedBin;
    }
}
