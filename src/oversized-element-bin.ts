import { IRectangle, IRectangleInput, Rectangle } from "./geom/Rectangle";
import { IOption } from "./types";
import { Bin } from "./abstract-bin";

export class OversizedElementBin<T extends IRectangleInput = IRectangleInput> extends Bin<T> {
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
     * two-argument construction and the bin then reports `data: null` while its rect keeps `{}`.
     * An explicitly supplied value, including null, is kept on both the bin and its rect.
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
            // As with `MaxRectsPacker.add(width, height, data)`: this form builds its own rect, so the
            // `T` it is stored as is the caller's declaration rather than something this class can check.
            const rect: IRectangle = new Rectangle(this.width, this.height);
            rect.oversized = true;
            if (args.length > 2) rect.data = this.data;
            this.rects.push(rect as unknown as T);
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
     * Copy this placeholder's rect, free rectangles, dimensions, maxima, options, tag and bin data.
     * The rect and free rectangles use `Rectangle.Clone`, and options are copied, so changing them
     * leaves the source alone. Payloads in `rect.data` and bin `data` remain shared (a shallow copy),
     * and a rect class that cannot be copied that way reports it from there. The copy still refuses
     * additions, even when it carries free space restored by `load()`.
     *
     * @returns a placeholder holding a copy of the same rect and restored state; bin data is kept
     * separately from rect data, including `null` from a two-argument construction
     */
    clone(): Bin<T> {
        let clonedBin: OversizedElementBin<T> = new OversizedElementBin<T>(Rectangle.Clone(this.rects[0]));
        clonedBin.width = this.width;
        clonedBin.height = this.height;
        clonedBin.maxWidth = this.maxWidth;
        clonedBin.maxHeight = this.maxHeight;
        clonedBin.options = { ...this.options };
        clonedBin.freeRects = this.freeRects.map((rect) => Rectangle.Clone(rect));
        clonedBin.tag = this.tag;
        clonedBin.data = this.data;
        return clonedBin;
    }
}
