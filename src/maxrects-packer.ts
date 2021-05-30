import { Rectangle, IRectangle } from "./geom/Rectangle";
import { MaxRectsBin } from "./maxrects-bin";
import { OversizedElementBin } from "./oversized-element-bin";
import { Bin, IBin } from "./abstract-bin";

export const EDGE_MAX_VALUE: number = 4096;
export const EDGE_MIN_VALUE: number = 128;
export enum PACKING_LOGIC {
    MAX_AREA = 0,
    MAX_EDGE = 1
}

/**
 * Options for MaxRect Packer
 * @property {boolean} options.smart Smart sizing packer (default is true)
 * @property {boolean} options.pot use power of 2 sizing (default is true)
 * @property {boolean} options.square use square size (default is false)
 * @property {boolean} options.allowRotation allow rotation packing (default is false)
 * @property {boolean} options.tag allow auto grouping based on `rect.tag` (default is false)
 * @property {boolean} options.exclusiveTag tagged rects will have dependent bin, if set to `false`, packer will try to put tag rects into the same bin (default is true)
 * @property {boolean} options.border atlas edge spacing (default is 0)
 * @property {PACKING_LOGIC} options.logic MAX_AREA or MAX_EDGE based sorting logic (default is MAX_EDGE)
 * @export
 * @interface Option
 */
export interface IOption {
    smart?: boolean;
    pot?: boolean;
    square?: boolean;
    allowRotation?: boolean;
    tag?: boolean;
    exclusiveTag?: boolean;
    border?: number;
    logic?: PACKING_LOGIC;
}

export class MaxRectsPacker<T extends IRectangle = Rectangle> {

    /**
     * The Bin array added to the packer
     *
     * @type {Bin[]}
     * @memberof MaxRectsPacker
     */
    public bins: Bin<T>[];

    /**
     * Options for MaxRect Packer
     * @property {boolean} options.smart Smart sizing packer (default is true)
     * @property {boolean} options.pot use power of 2 sizing (default is true)
     * @property {boolean} options.square use square size (default is false)
     * @property {boolean} options.allowRotation allow rotation packing (default is false)
     * @property {boolean} options.tag allow auto grouping based on `rect.tag` (default is false)
     * @property {boolean} options.exclusiveTag tagged rects will have dependent bin, if set to `false`, packer will try to put tag rects into the same bin (default is true)
     * @property {boolean} options.border atlas edge spacing (default is 0)
     * @property {PACKING_LOGIC} options.logic MAX_AREA or MAX_EDGE based sorting logic (default is MAX_EDGE)
     * @export
     * @interface Option
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
    }

    /**
     * Creates an instance of MaxRectsPacker.
     * @param {number} width of the output atlas (default is 4096)
     * @param {number} height of the output atlas (default is 4096)
     * @param {number} padding between glyphs/images (default is 0)
     * @param {IOption} [options={}] (Optional) packing options
     * @memberof MaxRectsPacker
     */
    constructor (
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
     * @param {number} width of the input bin/rectangle
     * @param {number} height of the input bin/rectangle
     * @param {*} data custom data object
     * @memberof MaxRectsPacker
     */
    public add (width: number, height: number, data: any): T;
    /**
     * Add a bin/rectangle object extends IRectangle to packer
     * @template T Generic type extends IRectangle interface
     * @param {T} rect the rect object add to the packer bin
     * @memberof MaxRectsPacker
     */
    public add (rect: T): T;
    public add (...args: any[]): any {
        if (args.length === 1) {
            if (typeof args[0] !== 'object') throw new Error("MacrectsPacker.add(): Wrong parameters");
            const rect = args[0] as T;
            if (rect.width > this.width || rect.height > this.height) {
                this.bins.push(new OversizedElementBin<T>(rect));
            } else {
                let added = this.bins.slice(this._currentBinIndex).find(bin => bin.add(rect) !== undefined);
                if (!added) {
                    let bin = new MaxRectsBin<T>(this.width, this.height, this.padding, this.options);
                    let tag = (rect.data && rect.data.tag) ? rect.data.tag : rect.tag ? rect.tag : undefined;
                    if (this.options.tag && tag) bin.tag = tag;
                    bin.add(rect);
                    this.bins.push(bin);
                }
            }
            return rect;
        } else {
            const rect: IRectangle = new Rectangle(args[0], args[1]);
            if (args.length > 2) rect.data = args[2];

            if (rect.width > this.width || rect.height > this.height) {
                this.bins.push(new OversizedElementBin<T>(rect as T));
            } else {
                let added = this.bins.slice(this._currentBinIndex).find(bin => bin.add(rect as T) !== undefined);
                if (!added) {
                    let bin = new MaxRectsBin<T>(this.width, this.height, this.padding, this.options);
                    if (this.options.tag && rect.data.tag) bin.tag = rect.data.tag;
                    bin.add(rect as T);
                    this.bins.push(bin);
                }
            }
            return rect as T;
        }
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
     * @param {IRectangle[]} rects Array of bin/rectangles
     * @memberof MaxRectsPacker
     */
     public addArray(rects: T[]) {
        if (!this.options.tag || this.options.exclusiveTag) {
            // if not using tag or using exclusiveTag, old approach
            this.sort(rects, this.options.logic).forEach(rect => this.add(rect));
        } else {
            // sort rects by tags first
            if (rects.length === 0) return;
            rects.sort((a,b) => {
                const aTag = (a.data && a.data.tag) ? a.data.tag : a.tag ? a.tag : undefined;
                const bTag = (b.data && b.data.tag) ? b.data.tag : b.tag ? b.tag : undefined;
                return bTag === undefined ? -1 : aTag === undefined ? 1 : bTag > aTag ? -1 : 1;
            });
            
            // iterate all bins to find the first bin which can place rects with same tag
            //
            let currentTag: any;
            let currentIdx: number = 0;
            let targetBin = this.bins.slice(this._currentBinIndex).find((bin, binIndex) => {
                let testBin = bin.clone();
                for (let i = currentIdx; i < rects.length; i++) {
                    const rect = rects[i];
                    const tag = (rect.data && rect.data.tag) ? rect.data.tag : rect.tag ? rect.tag : undefined;

                    // initialize currentTag
                    if (i === 0) currentTag = tag;

                    if (tag !== currentTag) {
                        // all current tag memeber tested successfully
                        currentTag = tag;
                        // do addArray()
                        this.sort(rects.slice(currentIdx, i), this.options.logic).forEach(r => bin.add(r));
                        currentIdx = i;

                        // recrusively addArray() with remaining rects
                        this.addArray(rects.slice(i));
                        return true;
                    }

                    // remaining untagged rect will use normal addArray()
                    if (tag === undefined) {
                        // do addArray()
                        this.sort(rects.slice(i), this.options.logic).forEach(r => this.add(r));
                        currentIdx = rects.length;
                        // end test
                        return true;
                    }

                    // still in the same tag group
                    if (testBin.add(rect) === undefined) {
                        // add the rects that could fit into the bins already
                        // do addArray()
                        this.sort(rects.slice(currentIdx, i), this.options.logic).forEach(r => bin.add(r));
                        currentIdx = i;

                        // current bin cannot contain all tag members
                        // procceed to test next bin
                        return false;
                    }
                }

                // all rects tested
                // do addArray() to the remaining tag group
                this.sort(rects.slice(currentIdx), this.options.logic).forEach(r => bin.add(r));
                return true;
            });

            // create a new bin if no current bin fit
            if (!targetBin) {
                const rect = rects[currentIdx];
                const bin = new MaxRectsBin<T>(this.width, this.height, this.padding, this.options);
                const tag = (rect.data && rect.data.tag) ? rect.data.tag : rect.tag ? rect.tag : undefined;
                if (this.options.tag && this.options.exclusiveTag && tag) bin.tag = tag;
                this.bins.push(bin);
                // Add the rect to the newly created bin
                bin.add(rect)
                currentIdx++
                this.addArray(rects.slice(currentIdx));
            }
        }
    }

    /**
     * Reset entire packer to initial states, keep settings
     *
     * @memberof MaxRectsPacker
     */
    public reset (): void {
        this.bins = [];
        this._currentBinIndex = 0;
    }

    /**
     * Repack all elements inside bins
     *
     * @param {boolean} [quick=true] quick repack only dirty bins
     * @returns {void}
     * @memberof MaxRectsPacker
     */
    public repack (quick: boolean = true): void {
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
     * Stop adding new element to the current bin and return a new bin.
     *
     * note: After calling `next()` all elements will no longer added to previous bins.
     *
     * @returns {Bin}
     * @memberof MaxRectsPacker
     */
    public next (): number {
        this._currentBinIndex = this.bins.length;
        return this._currentBinIndex;
    }

    /**
     * Load bins to the packer, overwrite exist bins
     * @param {MaxRectsBin[]} bins MaxRectsBin objects
     * @memberof MaxRectsPacker
     */
    public load (bins: IBin[]) {
        bins.forEach((bin, index) => {
            if (bin.maxWidth > this.width || bin.maxHeight > this.height) {
                this.bins.push(new OversizedElementBin(bin.width, bin.height, {}));
            } else {
                let newBin = new MaxRectsBin<T>(this.width, this.height, this.padding, bin.options);
                newBin.freeRects.splice(0);
                bin.freeRects.forEach((r, i) => {
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
     * @memberof MaxRectsPacker
     */
    public save (): IBin[] {
        let saveBins: IBin[] = [];
        this.bins.forEach((bin => {
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
            bin.freeRects.forEach(r => {
                saveBin.freeRects.push({
                    x: r.x,
                    y: r.y,
                    width: r.width,
                    height: r.height
                });
            });
            saveBins.push(saveBin);
        }));
        return saveBins;
    }

    /**
     * Sort the given rects based on longest edge or surface area.
     *
     * If rects have the same sort value, will sort by second key `hash` if presented.
     *
     * @private
     * @param {T[]} rects
     * @param {PACKING_LOGIC} [logic=PACKING_LOGIC.MAX_EDGE] sorting logic, "area" or "edge"
     * @returns
     * @memberof MaxRectsPacker
     */
    private sort (rects: T[], logic: IOption['logic'] = PACKING_LOGIC.MAX_EDGE) {
        return rects.slice().sort((a, b) => {
            const result = (logic === PACKING_LOGIC.MAX_EDGE) ?
                Math.max(b.width, b.height) - Math.max(a.width, a.height) :
                b.width * b.height - a.width * a.height;
            if (result === 0 && a.hash && b.hash) {
                return a.hash > b.hash ? -1 : 1;
            } else return result;
        });
    }

    private _currentBinIndex: number = 0;
    /**
     * Return current functioning bin index, perior to this wont accept any new elements
     *
     * @readonly
     * @type {number}
     * @memberof MaxRectsPacker
     */
    get currentBinIndex (): number { return this._currentBinIndex; }

    /**
     * Returns dirty status of all child bins
     *
     * @readonly
     * @type {boolean}
     * @memberof MaxRectsPacker
     */
    get dirty (): boolean { return this.bins.some(bin => bin.dirty); }

    /**
     * Return all rectangles in this packer
     *
     * @readonly
     * @type {T[]}
     * @memberof MaxRectsPacker
     */
    get rects (): T[] {
        let allRects: T[] = [];
        for (let bin of this.bins) {
            allRects.push(...bin.rects);
        }
        return allRects;
    }
}
