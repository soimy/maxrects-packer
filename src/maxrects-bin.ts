import { EDGE_MAX_VALUE, PACKING_LOGIC, IOption } from "./types";
import { Rectangle, IRectangle } from "./geom/Rectangle";
import { Bin } from "./abstract-bin";

/**
 * Put a copy back into the orientation its source was handed over in, undoing the turn this bin applied to
 * it: `rot` flips back and the dimensions swap with it. `Rectangle`'s setter swaps on the way; an object
 * without one — the plain `{width, height}` rects the README advertises — keeps the footprint it has, so
 * the dimensions are pinned afterwards either way.
 *
 * @param rect - the copy to restore, mutated in place
 */
function undoBinRotation(rect: IRectangle): void {
    const width = rect.width;
    const height = rect.height;
    rect.rot = !rect.rot;
    rect.width = height;
    rect.height = width;
}

export class MaxRectsBin<T extends IRectangle = Rectangle> extends Bin<T> {
    public width: number;
    public height: number;
    public freeRects: Rectangle[] = [];
    /**
     * The rects this bin holds, in the order they were placed. This is the packing output rather than an
     * input: the bin keeps its own record of which placements turned their rect beside it, and a consumer
     * that reshapes this array — a `splice()`, a `sort()`, an assignment — leaves records that no longer line
     * up, which `clone()` ignores rather than applying to the wrong rect.
     */
    public rects: T[] = [];
    private verticalExpand: boolean = false;
    /**
     * Whether each placement turned its rect, in placement order, each entry naming the rect it was recorded
     * for. It is the one thing a placed rect cannot say about itself: `rot` true with the dimensions swapped
     * describes both a rect this bin rotated and one the caller handed over already rotated, and `clone()`
     * needs the difference to replay the same input. Recorded per placement rather than per rect, because the
     * same object can be placed more than once, and kept here rather than on the rect, because a rect the
     * caller sealed rejects a new property — and such a rect packed fine before this record existed. The rect
     * each entry names is what lets `turned()` tell a record that still lines up from one a consumer reshaped
     * `rects` out from under.
     */
    private turnedByPlacement: { rect: T; turned: boolean }[] = [];
    private stage: Rectangle;
    private border: number;
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

    constructor(
        public maxWidth: number = EDGE_MAX_VALUE,
        public maxHeight: number = EDGE_MAX_VALUE,
        public padding: number = 0,
        options: IOption = {}
    ) {
        super();
        this.options = { ...this.options, ...options };
        this.width = this.options.smart ? 0 : maxWidth;
        this.height = this.options.smart ? 0 : maxHeight;
        this.border = this.options.border ? this.options.border : 0;
        this.freeRects.push(
            new Rectangle(
                this.maxWidth + this.padding - this.border * 2,
                this.maxHeight + this.padding - this.border * 2,
                this.border,
                this.border
            )
        );
        this.stage = new Rectangle(this.width, this.height);
    }

    public add(rect: T): T | undefined;
    public add(width: number, height: number, data: any): T | undefined;
    public add(...args: any[]): any {
        let data: any;
        let rect: IRectangle;
        if (args.length === 1) {
            if (typeof args[0] !== "object") throw new Error("MacrectsBin.add(): Wrong parameters");
            rect = args[0] as T;
        } else {
            data = args.length > 2 ? args[2] : null;
            rect = new Rectangle(args[0], args[1]);
            rect.data = data;
            rect.setDirty(false);
        }

        // The tag gate is in place(), which every path reaches; a rect this bin refuses comes back
        // from there as undefined.
        const wasRotated = rect.rot === true;
        const result = this.place(rect);
        if (result) {
            this.rects.push(result);
            this.turnedByPlacement.push({ rect: result, turned: this.turnedBy(wasRotated, result) });
        }
        return result;
    }

    public repack(): T[] | undefined {
        let unpacked: T[] = [];
        this.reset();
        // re-sort rects from big to small
        this.rects.sort((a, b) => {
            const result = Math.max(b.width, b.height) - Math.max(a.width, a.height);
            if (result === 0 && a.hash && b.hash) {
                return a.hash > b.hash ? -1 : 1;
            } else return result;
        });
        // Every rect is placed again below, so the record is rebuilt from scratch rather than carried over —
        // a rect that goes back unrotated must not stay marked as turned.
        this.turnedByPlacement = [];
        for (let rect of this.rects) {
            const wasRotated = rect.rot === true;
            if (this.place(rect)) {
                this.turnedByPlacement.push({ rect, turned: this.turnedBy(wasRotated, rect) });
            } else {
                unpacked.push(rect);
            }
        }
        // A rect that could not be placed left no record behind — the loop above records the placements that
        // succeeded and nothing else — so only `rects` has an entry to remove here. Splicing the record by
        // this index would take a survivor's, which shifts every record after it.
        for (let rect of unpacked) this.rects.splice(this.rects.indexOf(rect), 1);
        return unpacked.length > 0 ? unpacked : undefined;
    }

    public reset(deepReset: boolean = false, resetOption: boolean = false): void {
        if (deepReset) {
            if (this.data) delete this.data;
            if (this.tag) delete this.tag;
            this.rects = [];
            this.turnedByPlacement = [];
            if (resetOption) {
                this.options = {
                    smart: true,
                    pot: true,
                    square: true,
                    allowRotation: false,
                    tag: false,
                    border: 0
                };
            }
        }
        this.width = this.options.smart ? 0 : this.maxWidth;
        this.height = this.options.smart ? 0 : this.maxHeight;
        this.border = this.options.border ? this.options.border : 0;
        this.freeRects = [
            new Rectangle(
                this.maxWidth + this.padding - this.border * 2,
                this.maxHeight + this.padding - this.border * 2,
                this.border,
                this.border
            )
        ];
        this.stage = new Rectangle(this.width, this.height);
        this._dirty = 0;
    }

    /**
     * Copy this bin. The copy packs copies of the same rects, so neither bin can reach the other's
     * state: mutating a rect one of them holds, or adding to one bin, leaves the other alone. The rect
     * copies are shallow (`Rectangle.Clone`), so a payload stored in `rect.data` is still shared, and a
     * rect class that cannot be copied that way reports it from `Rectangle.Clone()`.
     *
     * The copy reproduces the source's placements under the bin's current `options`. The replay is handed
     * each rect in the orientation the source was handed it, which is what makes that work: a rect this bin
     * turned is stored as the footprint it occupies, and the bin records which placements turned theirs,
     * because the state alone cannot say whether the bin turned a rect or the caller handed it over already
     * rotated. When that orientation is no longer one the bin takes — `options.allowRotation` turned off
     * after the placement, say — the rect falls back to the orientation it is stored in rather than failing
     * the copy.
     *
     * It throws when the replay cannot place a rect this bin holds in either orientation, which a rect
     * resized after it was placed into something the bin can no longer hold brings about. Reporting it beats
     * handing back a bin that quietly holds fewer rects than the original.
     *
     * @returns a bin holding copies of the same rects, with the same options, tag and data — the copies
     * are re-packed under the current `options`, so the size it grows to and the placements it lands on can
     * differ from the source's when a rect was edited after it was placed, or when the options changed
     * since
     */
    public clone(): MaxRectsBin<T> {
        // The replay runs with the tag gate off. The source already settled which rects it accepts — in
        // exclusive mode that is its own tag, but a bin tagged after it was filled, or one carrying
        // several tags in non-exclusive mode, holds rects its own gate would now refuse, and re-running
        // it would give back a copy with fewer rects than the original. `options`, `tag` and `data` are
        // restored to the source's below.
        let clonedBin: MaxRectsBin<T> = new MaxRectsBin<T>(this.maxWidth, this.maxHeight, this.padding, {
            ...this.options,
            exclusiveTag: false
        });
        for (let index = 0; index < this.rects.length; index++) {
            const rect = this.rects[index];
            const copy = Rectangle.Clone(rect);
            // The replay scores the dimensions it is handed, so hand it the ones the caller gave: a rect
            // this bin turned would otherwise be scored as its rotated footprint, which picks a free rect
            // the source never looked at and lands the rect somewhere else, or refuses it outright.
            if (this.turned(index, rect)) undoBinRotation(copy);
            if (clonedBin.add(copy) === undefined) {
                // A rect this bin turned is replayed in the orientation the caller gave it, and the bin's
                // options can have changed since the placement — `allowRotation` turned off, say — which
                // leaves that orientation one the replay no longer takes. Fall back to the orientation the
                // rect is stored in, which is what this method did before it knew the difference: only the
                // rect that needs it is affected, and a complete copy beats throwing over one that no longer
                // fits.
                const stored = this.turned(index, rect) ? Rectangle.Clone(rect) : undefined;
                if (!stored || clonedBin.add(stored) === undefined) {
                    throw new Error(
                        "MaxRectsBin.clone(): the bin holds a rect it can no longer place, so the copy would be incomplete — repack the bin before cloning it"
                    );
                }
            }
        }
        clonedBin.options = { ...this.options };
        clonedBin.tag = this.tag;
        clonedBin.data = this.data;
        return clonedBin;
    }

    /**
     * Whether this bin turned the rect `rects` holds at `index`, as the placement recorded it. `rects` is the
     * packing output, and a consumer that reshapes it — a `splice()`, a `sort()`, an assignment — leaves the
     * record describing placements that are no longer at those positions. So the record is only trusted where
     * it still names the rect it was made for; an entry that no longer lines up is ignored, and that rect is
     * replayed in the orientation it is stored in.
     *
     * @param index - the position in `rects`
     * @param rect - the rect held there
     * @returns true when the placement that put this rect in the bin rotated it
     */
    private turned(index: number, rect: T): boolean {
        const entry = this.turnedByPlacement[index];
        return entry !== undefined && entry.rect === rect && entry.turned;
    }

    /**
     * Whether a placement turned its rect. `rot` is the one thing a placement changes about the orientation,
     * so a rect that came out of it with a different value than it went in was turned — the fact `clone()`
     * needs to hand its replay the same input.
     *
     * @param wasRotated - `rot` as the rect was handed to the placement
     * @param rect - the rect the placement returned
     * @returns true when the placement rotated it away from the orientation it was handed in
     */
    private turnedBy(wasRotated: boolean, rect: T): boolean {
        return wasRotated !== (rect.rot === true);
    }

    private place(rect: IRectangle): T | undefined {
        // recheck if tag matched
        let tag = rect.data && rect.data.tag ? rect.data.tag : rect.tag ? rect.tag : undefined;
        if (this.options.tag && this.options.exclusiveTag && this.tag !== tag) return undefined;

        let node: IRectangle | undefined;
        let allowRotation: boolean | undefined;
        // getter/setter do not support hasOwnProperty()
        if (Object.prototype.hasOwnProperty.call(rect, "_allowRotation") && rect.allowRotation !== undefined) {
            allowRotation = rect.allowRotation; // Per Rectangle allowRotation override packer settings
        } else {
            allowRotation = this.options.allowRotation;
        }
        node = this.findNode(rect.width + this.padding, rect.height + this.padding, allowRotation);

        if (node) {
            // A smart bin has to grow to the footprint of the node it picked. That growth is
            // abandoned when pot/square rounding pushes it past maxWidth/maxHeight, and then the
            // node does not fit this bin: fail the placement instead of reporting the rect inside a
            // bin whose size does not contain it.
            const fitted = !this.options.smart || this.updateBinSize(node, false) || this.stage.contain(node);
            if (!fitted) return undefined;
            let numRectToProcess = this.freeRects.length;
            let i: number = 0;
            while (i < numRectToProcess) {
                if (this.splitNode(this.freeRects[i], node)) {
                    this.freeRects.splice(i, 1);
                    numRectToProcess--;
                    i--;
                }
                i++;
            }
            this.pruneFreeList();
            this.verticalExpand = this.options.logic !== PACKING_LOGIC.FILL_WIDTH && this.width > this.height;
            rect.x = node.x;
            rect.y = node.y;
            if (rect.rot === undefined) rect.rot = false;
            const rotated = rect.rot;
            const width = rect.width;
            const height = rect.height;
            rect.rot = node.rot ? !rotated : rotated;
            // `Rectangle.rot` swaps width/height in its setter. An object without one — the plain
            // `{width, height}` rects the README advertises — would keep reporting the unrotated
            // footprint while claiming to be rotated, so swap it here.
            if (rect.rot !== rotated && rect.width === width && rect.height === height) {
                rect.width = height;
                rect.height = width;
            }
            this._dirty++;
            return rect as T;
        } else if (!this.verticalExpand) {
            if (
                this.updateBinSize(
                    new Rectangle(
                        rect.width + this.padding,
                        rect.height + this.padding,
                        this.width + this.padding - this.border,
                        this.border
                    )
                ) ||
                this.updateBinSize(
                    new Rectangle(
                        rect.width + this.padding,
                        rect.height + this.padding,
                        this.border,
                        this.height + this.padding - this.border
                    )
                )
            ) {
                return this.place(rect);
            }
        } else {
            if (
                this.updateBinSize(
                    new Rectangle(
                        rect.width + this.padding,
                        rect.height + this.padding,
                        this.border,
                        this.height + this.padding - this.border
                    )
                ) ||
                this.updateBinSize(
                    new Rectangle(
                        rect.width + this.padding,
                        rect.height + this.padding,
                        this.width + this.padding - this.border,
                        this.border
                    )
                )
            ) {
                return this.place(rect);
            }
        }
        return undefined;
    }

    /**
     * Find the best rect out of freeRects
     * This method has different logics to resolve the best rect.
     * @param width
     * @param height
     * @param allowRotation
     * @returns Rectangle of the best rect for placement
     */
    private findNode(width: number, height: number, allowRotation?: boolean): Rectangle | undefined {
        // scoring based on one single number. The smaller the better the choice.
        let score: number = Number.MAX_VALUE;
        let areaFit: number;
        let r: Rectangle;
        let bestNode: Rectangle | undefined;
        for (let i in this.freeRects) {
            r = this.freeRects[i];
            if (r.width >= width && r.height >= height) {
                if (this.options.logic === PACKING_LOGIC.MAX_AREA) {
                    // the rect with the lowest rest area wins
                    areaFit = r.width * r.height - width * height;
                } else if (this.options.logic === PACKING_LOGIC.FILL_WIDTH) {
                    // this logic needs to factors to build a score.
                    // 1. rect position: choose the most rightest one with the lowest y coordinate.
                    // 2. size that needs to grow to place the element. The lower the better score (leads to optimal rotation placement)

                    const currentRectPositionScore = r.x + r.y * this.maxWidth; // each y value adds a full width to the score to balance x and y coordinates to a single number
                    const numberOfBetterRects = this.freeRects.filter(
                        (rect) => rect.x + rect.y * this.maxWidth < currentRectPositionScore
                    ).length; // search if there are rects, righter and a lower y coordinate.

                    // calculate how much space will be add to total height
                    const heightToGain = r.y + height - this.height;

                    areaFit = numberOfBetterRects + heightToGain; // add both factors together
                } else {
                    // the rect with the lowest loss of either width or height wins
                    areaFit = Math.min(r.width - width, r.height - height);
                }
                if (areaFit < score) {
                    bestNode = new Rectangle(width, height, r.x, r.y);
                    score = areaFit;
                }
            }

            if (!allowRotation) continue;

            // Continue to test 90-degree rotated rectangle
            if (r.width >= height && r.height >= width) {
                if (this.options.logic === PACKING_LOGIC.MAX_AREA) {
                    areaFit = r.width * r.height - height * width;
                } else if (this.options.logic === PACKING_LOGIC.FILL_WIDTH) {
                    const currentRectPositionScore = r.x + r.y * this.maxWidth;
                    const numberOfBetterRects = this.freeRects.filter(
                        (rect) => rect.x + rect.y * this.maxWidth < currentRectPositionScore
                    ).length; // search if there are rects, righter and a lower y coordinate.

                    // calculate how much space will be add to total height
                    const heightToGain = r.y + width - this.height;

                    areaFit = numberOfBetterRects + heightToGain; // add both factors together
                } else {
                    areaFit = Math.min(r.height - width, r.width - height);
                }
                if (areaFit < score) {
                    bestNode = new Rectangle(height, width, r.x, r.y, true); // Rotated node
                    score = areaFit;
                }
            }
        }
        return bestNode;
    }

    private splitNode(freeRect: IRectangle, usedNode: IRectangle): boolean {
        // Test if usedNode intersect with freeRect. `collide()` is the four overlap tests that used to
        // guard each split below, so reaching this line already proves both of them.
        if (!freeRect.collide(usedNode)) return false;

        // Do vertical split
        // New node at the top side of the used node
        if (usedNode.y > freeRect.y && usedNode.y < freeRect.y + freeRect.height) {
            let newNode: Rectangle = new Rectangle(freeRect.width, usedNode.y - freeRect.y, freeRect.x, freeRect.y);
            this.freeRects.push(newNode);
        }
        // New node at the bottom side of the used node
        if (usedNode.y + usedNode.height < freeRect.y + freeRect.height) {
            let newNode = new Rectangle(
                freeRect.width,
                freeRect.y + freeRect.height - (usedNode.y + usedNode.height),
                freeRect.x,
                usedNode.y + usedNode.height
            );
            this.freeRects.push(newNode);
        }

        // Do Horizontal split
        // New node at the left side of the used node.
        if (usedNode.x > freeRect.x && usedNode.x < freeRect.x + freeRect.width) {
            let newNode = new Rectangle(usedNode.x - freeRect.x, freeRect.height, freeRect.x, freeRect.y);
            this.freeRects.push(newNode);
        }
        // New node at the right side of the used node.
        if (usedNode.x + usedNode.width < freeRect.x + freeRect.width) {
            let newNode = new Rectangle(
                freeRect.x + freeRect.width - (usedNode.x + usedNode.width),
                freeRect.height,
                usedNode.x + usedNode.width,
                freeRect.y
            );
            this.freeRects.push(newNode);
        }
        return true;
    }

    private pruneFreeList() {
        // Go through each pair of freeRects and remove any rects that is redundant
        let i: number = 0;
        let j: number = 0;
        let len: number = this.freeRects.length;
        while (i < len) {
            j = i + 1;
            let tmpRect1 = this.freeRects[i];
            while (j < len) {
                let tmpRect2 = this.freeRects[j];
                if (tmpRect2.contain(tmpRect1)) {
                    this.freeRects.splice(i, 1);
                    i--;
                    len--;
                    break;
                }
                if (tmpRect1.contain(tmpRect2)) {
                    this.freeRects.splice(j, 1);
                    j--;
                    len--;
                }
                j++;
            }
            i++;
        }
    }

    /**
     * Grow the bin so that it contains the given node.
     * @param node - the node the bin has to contain
     * @param considerRotation - whether the node may also be placed rotated when `options.allowRotation` is on, in which case the bin grows by the smaller of the two (default is true)
     * @returns true when the bin was grown
     */
    private updateBinSize(node: IRectangle, considerRotation: boolean = true): boolean {
        if (!this.options.smart) return false;
        if (this.stage.contain(node)) return false;
        let tmpWidth: number = Math.max(this.width, node.x + node.width - this.padding + this.border);
        let tmpHeight: number = Math.max(this.height, node.y + node.height - this.padding + this.border);
        let tmpFits: boolean = !(tmpWidth > this.maxWidth || tmpHeight > this.maxHeight);
        if (this.options.allowRotation && considerRotation) {
            // do extra test on rotated node whether it's a better choice
            const rotWidth: number = Math.max(this.width, node.x + node.height - this.padding + this.border);
            const rotHeight: number = Math.max(this.height, node.y + node.width - this.padding + this.border);
            const rotFits: boolean = !(rotWidth > this.maxWidth || rotHeight > this.maxHeight);
            // only compare when both rects will fit into bin
            if (tmpFits && rotFits && rotWidth * rotHeight < tmpWidth * tmpHeight) {
                tmpWidth = rotWidth;
                tmpHeight = rotHeight;
            }
            // if rot fits and tmpFits not then do not compare area and set rot directly (some cases area of not rotated is smaller but will not fit)
            if (rotFits && !tmpFits) {
                tmpWidth = rotWidth;
                tmpHeight = rotHeight;
            }
        }
        if (this.options.pot) {
            tmpWidth = Math.pow(2, Math.ceil(Math.log(tmpWidth) * Math.LOG2E));
            tmpHeight = Math.pow(2, Math.ceil(Math.log(tmpHeight) * Math.LOG2E));
        }
        if (this.options.square) {
            tmpWidth = tmpHeight = Math.max(tmpWidth, tmpHeight);
        }
        tmpFits = !(tmpWidth > this.maxWidth || tmpHeight > this.maxHeight);
        if (!tmpFits) {
            return false;
        }
        this.expandFreeRects(tmpWidth + this.padding, tmpHeight + this.padding);
        this.width = this.stage.width = tmpWidth;
        this.height = this.stage.height = tmpHeight;
        return true;
    }

    private expandFreeRects(width: number, height: number) {
        this.freeRects.forEach((freeRect) => {
            if (freeRect.x + freeRect.width >= Math.min(this.width + this.padding - this.border, width)) {
                freeRect.width = width - freeRect.x - this.border;
            }
            if (freeRect.y + freeRect.height >= Math.min(this.height + this.padding - this.border, height)) {
                freeRect.height = height - freeRect.y - this.border;
            }
        }, this);
        this.freeRects.push(
            new Rectangle(
                width - this.width - this.padding,
                height - this.border * 2,
                this.width + this.padding - this.border,
                this.border
            )
        );
        this.freeRects.push(
            new Rectangle(
                width - this.border * 2,
                height - this.height - this.padding,
                this.border,
                this.height + this.padding - this.border
            )
        );
        this.freeRects = this.freeRects.filter((freeRect) => {
            return !(
                freeRect.width <= 0 ||
                freeRect.height <= 0 ||
                freeRect.x < this.border ||
                freeRect.y < this.border
            );
        });
        this.pruneFreeList();
    }
}
