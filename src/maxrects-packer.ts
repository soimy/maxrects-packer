import { Rectangle, IRectangle } from "./geom/Rectangle";
import { MaxRectsBin } from "./maxrects-bin";
import { OversizedElementBin } from "./oversized-element-bin";
import { Bin, IBin } from "./abstract-bin";
import { EDGE_MAX_VALUE, PACKING_LOGIC, IOption } from "./types";

// Re-export types for backward compatibility
export { EDGE_MAX_VALUE, EDGE_MIN_VALUE, PACKING_LOGIC, IOption } from "./types";

/**
 * The first item `predicate` accepts, or `undefined`. `Array.prototype.find` is ES2015, and the
 * published bundle promises no engine requirement beyond ES5: `target: es5` downlevels syntax, not
 * runtime APIs, so the language method would stay in the bundle and throw on an ES5 engine. The
 * predicate runs in order and the search stops at the first acceptance, as the language method does.
 * @param items - the array to search
 * @param predicate - the test each item is given, in order
 * @returns the first accepted item, or `undefined` when none is accepted
 */
function find<T>(items: T[], predicate: (item: T) => boolean): T | undefined {
    for (let i = 0; i < items.length; i++) {
        if (predicate(items[i])) return items[i];
    }
    return undefined;
}

export class MaxRectsPacker<T extends IRectangle = Rectangle> {
    /**
     * The Bin array added to the packer
     */
    public bins: Bin<T>[];

    /**
     * Options for MaxRect Packer, see {@link IOption} for the full list and defaults.
     */
    public options: IOption = {
        smart: true,
        pot: true,
        square: false,
        allowRotation: false,
        tag: false,
        exclusiveTag: true,
        border: 0,
        logic: PACKING_LOGIC.MAX_EDGE
    };

    /**
     * Creates an instance of MaxRectsPacker.
     *
     * @param width - width of the output atlas (default is 4096)
     * @param height - height of the output atlas (default is 4096)
     * @param padding - padding between glyphs/images (default is 0)
     * @param options - (Optional) packing options
     */
    constructor(
        public width: number = EDGE_MAX_VALUE,
        public height: number = EDGE_MAX_VALUE,
        public padding: number = 0,
        options: IOption = {}
    ) {
        this.bins = [];
        this.options = { ...this.options, ...options };
    }

    /**
     * Add a bin/rectangle object with data to packer
     *
     * @param width - width of the input bin/rectangle
     * @param height - height of the input bin/rectangle
     * @param data - custom data object; with `tag: true` the packer reads `data.tag` to label a bin
     * it has to open, so only an object can carry a tag. `undefined` is treated as untagged data
     * rather than rejected: the rect is offered to the existing bins first, and a bin opened for it
     * stays untagged — what the single-argument form does for a rect that carries no `data`
     */
    public add(width: number, height: number, data: any): T;
    /**
     * Add a bin/rectangle object extends IRectangle to packer
     *
     * @param rect - the rect object add to the packer bin
     */
    public add(rect: T): T;
    public add(...args: any[]): any {
        if (args.length === 1) {
            if (typeof args[0] !== "object") throw new Error("MacrectsPacker.add(): Wrong parameters");
            const rect = args[0] as T;
            if (
                !(
                    (rect.width <= this.width && rect.height <= this.height) ||
                    (this.options.allowRotation && rect.width <= this.height && rect.height <= this.width)
                )
            ) {
                this.bins.push(new OversizedElementBin<T>(rect));
            } else {
                let added = find(this.bins.slice(this._currentBinIndex), (bin) => bin.add(rect) !== undefined);
                if (!added) {
                    let bin = new MaxRectsBin<T>(this.width, this.height, this.padding, this.options);
                    let tag = rect.data && rect.data.tag ? rect.data.tag : rect.tag ? rect.tag : undefined;
                    if (this.options.tag && tag) bin.tag = tag;
                    if (this.addToBin(bin, rect)) this.bins.push(bin);
                }
            }
            return rect;
        } else {
            const rect: IRectangle = new Rectangle(args[0], args[1]);
            if (args.length > 2) rect.data = args[2];

            if (
                !(
                    (rect.width <= this.width && rect.height <= this.height) ||
                    (this.options.allowRotation && rect.width <= this.height && rect.height <= this.width)
                )
            ) {
                this.bins.push(new OversizedElementBin<T>(rect as T));
            } else {
                let added = find(this.bins.slice(this._currentBinIndex), (bin) => bin.add(rect as T) !== undefined);
                if (!added) {
                    let bin = new MaxRectsBin<T>(this.width, this.height, this.padding, this.options);
                    if (this.options.tag && rect.data && rect.data.tag) bin.tag = rect.data.tag;
                    if (this.addToBin(bin, rect as T)) this.bins.push(bin);
                }
            }
            return rect as T;
        }
    }

    /**
     * Add a rect to a bin, giving the rect its own oversized bin when the bin refuses it. A bin only
     * refuses a rect it cannot grow to fit (see `MaxRectsBin.place()`), and dropping such a rect is
     * never an option — every caller that would otherwise ignore `bin.add()` has to come through here.
     * @param bin - the bin that should take the rect
     * @param rect - the rect to add
     * @returns true when the bin took the rect
     */
    private addToBin(bin: Bin<T>, rect: T): boolean {
        if (bin.add(rect) !== undefined) return true;
        this.bins.push(new OversizedElementBin<T>(rect));
        return false;
    }

    /**
     * Add an Array of bins/rectangles to the packer.
     *
     * `Javascript`: Any object has property: { width, height, ... } is accepted.
     *
     * `Typescript`: object shall extends `MaxrectsPacker.IRectangle`.
     *
     * note: object has `hash` property will have more stable packing result
     *
     * @param rects - Array of bin/rectangles
     */
    public addArray(rects: T[]) {
        if (!this.options.tag || this.options.exclusiveTag) {
            // if not using tag or using exclusiveTag, old approach
            this.sort(rects, this.options.logic).forEach((rect) => this.add(rect));
        } else {
            // sort rects by tags first
            if (rects.length === 0) return;
            rects.sort((a, b) => {
                const aTag = a.data && a.data.tag ? a.data.tag : a.tag ? a.tag : undefined;
                const bTag = b.data && b.data.tag ? b.data.tag : b.tag ? b.tag : undefined;
                return bTag === undefined ? -1 : aTag === undefined ? 1 : bTag > aTag ? -1 : 1;
            });

            // iterate all bins to find the first bin which can place rects with same tag
            //
            let currentTag: any;
            let currentIdx: number = 0;
            let targetBin = find(this.bins.slice(this._currentBinIndex), (bin) => {
                let testBin: Bin<T>;
                try {
                    testBin = bin.clone();
                } catch {
                    // A bin that cannot be copied cannot be probed either, and `clone()` is deliberate
                    // about throwing (a rect it can no longer place, or a rect class whose state a copy
                    // cannot reach). Treat it as "this group does not fit this bin": the search goes on,
                    // and a new bin is opened below if nothing else takes the group. Letting it through
                    // would turn one un-copyable bin into a failed `addArray()` call.
                    return false;
                }
                for (let i = currentIdx; i < rects.length; i++) {
                    const rect = rects[i];
                    const tag = rect.data && rect.data.tag ? rect.data.tag : rect.tag ? rect.tag : undefined;

                    // initialize currentTag
                    if (i === 0) currentTag = tag;

                    if (tag !== currentTag) {
                        // all current tag memeber tested successfully
                        currentTag = tag;
                        // do addArray()
                        this.sort(rects.slice(currentIdx, i), this.options.logic).forEach((r) => this.addToBin(bin, r));
                        currentIdx = i;

                        // recrusively addArray() with remaining rects
                        this.addArray(rects.slice(i));
                        return true;
                    }

                    // remaining untagged rect will use normal addArray()
                    if (tag === undefined) {
                        // do addArray()
                        this.sort(rects.slice(i), this.options.logic).forEach((r) => this.add(r));
                        currentIdx = rects.length;
                        // end test
                        return true;
                    }

                    // still in the same tag group
                    if (testBin.add(rect) === undefined) {
                        // add the rects that could fit into the bins already
                        // do addArray()
                        this.sort(rects.slice(currentIdx, i), this.options.logic).forEach((r) => this.addToBin(bin, r));
                        currentIdx = i;

                        // current bin cannot contain all tag members
                        // procceed to test next bin
                        return false;
                    }
                }

                // all rects tested
                // do addArray() to the remaining tag group
                this.sort(rects.slice(currentIdx), this.options.logic).forEach((r) => this.addToBin(bin, r));
                return true;
            });

            // create a new bin if no current bin fit
            if (!targetBin) {
                const rect = rects[currentIdx];
                const bin = new MaxRectsBin<T>(this.width, this.height, this.padding, this.options);
                // Add the rect to the newly created bin. No tag is set: this branch is non-exclusive
                // mode, where a bin may hold several tag groups and its own tag never gates anything.
                if (this.addToBin(bin, rect)) this.bins.push(bin);
                currentIdx++;
                this.addArray(rects.slice(currentIdx));
            }
        }
    }

    /**
     * Reset entire packer to initial states, keep settings
     */
    public reset(): void {
        this.bins = [];
        this._currentBinIndex = 0;
    }

    /**
     * Repack all elements inside bins
     *
     * @param quick - quick repack only dirty bins (default is true)
     */
    public repack(quick: boolean = true): void {
        if (quick) {
            let unpack: T[] = [];
            for (let bin of this.bins) {
                if (bin.dirty) {
                    let up = bin.repack();
                    if (up) unpack.push(...up);
                }
            }
            this.addArray(unpack);
            return;
        }
        if (!this.dirty) return;
        const allRects = this.rects;
        this.reset();
        this.addArray(allRects);
    }

    /**
     * Stop adding new elements to the current bin.
     *
     * note: After calling `next()` all elements will no longer added to previous bins.
     *
     * @returns The index the next bin will take
     */
    public next(): number {
        this._currentBinIndex = this.bins.length;
        return this._currentBinIndex;
    }

    /**
     * Load bins to the packer: each one replaces the bin at its index, and existing bins past the
     * loaded array are kept. A saved bin too large for this packer is restored as an
     * `OversizedElementBin` placeholder at its index, keeping its `options`, `tag` and
     * `maxWidth`/`maxHeight`.
     *
     * @param bins - MaxRectsBin objects
     */
    public load(bins: IBin[]) {
        bins.forEach((bin, index) => {
            if (bin.maxWidth > this.width || bin.maxHeight > this.height) {
                // The placeholder takes its own index like every other entry: appending it instead
                // leaves the next entry free to write over the position the append landed on.
                const placeholder = new OversizedElementBin<T>(bin.width, bin.height, {});
                // The constructor sizes the maxima to the bin itself, but a smart bin saves a current
                // size below them; without the saved maxima the next `save()` would describe an entry
                // this packer loads back as a normal bin.
                placeholder.maxWidth = bin.maxWidth;
                placeholder.maxHeight = bin.maxHeight;
                if (bin.options) placeholder.options = { ...bin.options };
                if (bin.tag) placeholder.tag = bin.tag;
                this.bins[index] = placeholder;
            } else {
                let newBin = new MaxRectsBin<T>(this.width, this.height, this.padding, bin.options);
                newBin.freeRects.splice(0);
                bin.freeRects.forEach((r) => {
                    newBin.freeRects.push(new Rectangle(r.width, r.height, r.x, r.y));
                });
                newBin.width = bin.width;
                newBin.height = bin.height;
                if (bin.tag) newBin.tag = bin.tag;
                this.bins[index] = newBin;
            }
        }, this);
    }

    /**
     * Output current bins to save
     */
    public save(): IBin[] {
        let saveBins: IBin[] = [];
        this.bins.forEach((bin) => {
            let saveBin: IBin = {
                width: bin.width,
                height: bin.height,
                maxWidth: bin.maxWidth,
                maxHeight: bin.maxHeight,
                freeRects: [],
                rects: [],
                options: bin.options
            };
            if (bin.tag) saveBin = { ...saveBin, tag: bin.tag };
            bin.freeRects.forEach((r) => {
                saveBin.freeRects.push({
                    x: r.x,
                    y: r.y,
                    width: r.width,
                    height: r.height
                });
            });
            saveBins.push(saveBin);
        });
        return saveBins;
    }

    /**
     * Sort the given rects based on longest edge or surface area.
     *
     * If rects have the same sort value, will sort by second key `hash` if presented.
     *
     * @private
     * @param rects - array of rectangles to sort
     * @param logic - sorting logic, `PACKING_LOGIC.MAX_EDGE` or `PACKING_LOGIC.MAX_AREA` (default is MAX_EDGE)
     */
    private sort(rects: T[], logic: IOption["logic"] = PACKING_LOGIC.MAX_EDGE) {
        return rects.slice().sort((a, b) => {
            const result =
                logic === PACKING_LOGIC.MAX_EDGE
                    ? Math.max(b.width, b.height) - Math.max(a.width, a.height)
                    : b.width * b.height - a.width * a.height;
            if (result === 0 && a.hash && b.hash) {
                return a.hash > b.hash ? -1 : 1;
            } else return result;
        });
    }

    private _currentBinIndex: number = 0;
    /**
     * Return current functioning bin index, perior to this wont accept any new elements
     */
    get currentBinIndex(): number {
        return this._currentBinIndex;
    }

    /**
     * Returns dirty status of all child bins
     */
    get dirty(): boolean {
        return this.bins.some((bin) => bin.dirty);
    }

    /**
     * Return all rectangles in this packer
     */
    get rects(): T[] {
        let allRects: T[] = [];
        for (let bin of this.bins) {
            allRects.push(...bin.rects);
        }
        return allRects;
    }
}
