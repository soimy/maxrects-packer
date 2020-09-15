import { EDGE_MAX_VALUE, PACKING_LOGIC, IOption } from "./maxrects-packer";
import { Rectangle, IRectangle } from "./geom/Rectangle";
import { Bin } from "./abstract-bin";

export class MaxRectsBin<T extends IRectangle = Rectangle> extends Bin<T> {
    public width: number;
    public height: number;
    public freeRects: Rectangle[] = [];
    public rects: T[] = [];
    private verticalExpand: boolean = false;
    private stage: Rectangle;
    private border: number;
    public options: IOption = {
        smart: true,
        pot: true,
        square: true,
        allowRotation: false,
        tag: false,
        exclusiveTag: true,
        border: 0,
        logic: PACKING_LOGIC.MAX_EDGE
    }

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
        this.freeRects.push(new Rectangle(
            this.maxWidth + this.padding - this.border * 2,
            this.maxHeight + this.padding - this.border * 2,
            this.border,
            this.border));
        this.stage = new Rectangle(this.width, this.height);
    }

    public add (rect: T): T | undefined;
    public add (width: number, height: number, data: any): T | undefined;
    public add (...args: any[]): any {
        let data: any;
        let rect: IRectangle;
        if (args.length === 1) {
            if (typeof args[0] !== 'object') throw new Error("MacrectsBin.add(): Wrong parameters");
            rect = args[0] as T;
            // Check if rect.tag match bin.tag, if bin.tag not defined, it will accept any rect
            let tag = (rect.data && rect.data.tag) ? rect.data.tag : rect.tag ? rect.tag : undefined;
            if (this.options.tag && this.options.exclusiveTag && this.tag !== tag) return undefined;
        } else {
            data = args.length > 2 ? args[2] : null;
            // Check if data.tag match bin.tag, if bin.tag not defined, it will accept any rect
            if (this.options.tag && this.options.exclusiveTag) {
                if (data && this.tag !== data.tag) return undefined;
                if (!data && this.tag) return undefined;
            }
            rect = new Rectangle(args[0], args[1]);
            rect.data = data;
            rect.setDirty(false);
        }

        const result = this.place(rect);
        if (result) this.rects.push(result);
        return result;
    }

    public repack (): T[] | undefined {
        let unpacked: T[] = [];
        this.reset();
        // re-sort rects from big to small
        this.rects.sort((a, b) => {
            const result = Math.max(b.width, b.height) - Math.max(a.width, a.height);
            if (result === 0 && a.hash && b.hash) {
                return a.hash > b.hash ? -1 : 1;
            } else return result;
        });
        for (let rect of this.rects) {
            if (!this.place(rect)) {
                unpacked.push(rect);
            }
        }
        for (let rect of unpacked) this.rects.splice(this.rects.indexOf(rect), 1);
        return unpacked.length > 0 ? unpacked : undefined;
    }

    public reset (deepReset: boolean = false, resetOption: boolean = false): void {
        if (deepReset) {
            if (this.data) delete this.data;
            if (this.tag) delete this.tag;
            this.rects = [];
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
        this.freeRects = [new Rectangle(
            this.maxWidth + this.padding - this.border * 2,
            this.maxHeight + this.padding - this.border * 2,
            this.border,
            this.border)];
        this.stage = new Rectangle(this.width, this.height);
        this._dirty = 0;
    }

    public clone (): MaxRectsBin<T> {
        let clonedBin: MaxRectsBin<T> = new MaxRectsBin<T>(this.maxWidth, this.maxHeight, this.padding, this.options);
        for (let rect of this.rects) {
            clonedBin.add(rect);
        }
        return clonedBin;
    }

    private place (rect: IRectangle): T | undefined {
        // recheck if tag matched
        let tag = (rect.data && rect.data.tag) ? rect.data.tag : rect.tag ? rect.tag : undefined;
        if (this.options.tag && this.options.exclusiveTag && this.tag !== tag) return undefined;

        let node: IRectangle | undefined;
        let allowRotation: boolean | undefined;
        // getter/setter do not support hasOwnProperty()
        if (rect.hasOwnProperty("_allowRotation") && rect.allowRotation !== undefined) {
            allowRotation = rect.allowRotation; // Per Rectangle allowRotation override packer settings
        } else {
            allowRotation = this.options.allowRotation;
        }
        node = this.findNode(rect.width + this.padding, rect.height + this.padding, allowRotation);

        if (node) {
            this.updateBinSize(node);
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
            this.verticalExpand = this.width > this.height ? true : false;
            rect.x = node.x;
            rect.y = node.y;
            if (rect.rot === undefined) rect.rot = false;
            rect.rot = node.rot ? !rect.rot : rect.rot;
            this._dirty ++;
            return rect as T;
        } else if (!this.verticalExpand) {
            if (this.updateBinSize(new Rectangle(
                rect.width + this.padding, rect.height + this.padding,
                this.width + this.padding - this.border, this.border
            )) || this.updateBinSize(new Rectangle(
                rect.width + this.padding, rect.height + this.padding,
                this.border, this.height + this.padding - this.border
            ))) {
                return this.place(rect);
            }
        } else {
            if (this.updateBinSize(new Rectangle(
                rect.width + this.padding, rect.height + this.padding,
                this.border, this.height + this.padding - this.border
            )) || this.updateBinSize(new Rectangle(
                rect.width + this.padding, rect.height + this.padding,
                this.width + this.padding - this.border, this.border
            ))) {
                return this.place(rect);
            }
        }
        return undefined;
    }

    private findNode (width: number, height: number, allowRotation?: boolean): Rectangle | undefined {
        let score: number = Number.MAX_VALUE;
        let areaFit: number;
        let r: Rectangle;
        let bestNode: Rectangle | undefined;
        for (let i in this.freeRects) {
            r = this.freeRects[i];
            if (r.width >= width && r.height >= height) {
                areaFit = (this.options.logic === PACKING_LOGIC.MAX_AREA) ?
                    r.width * r.height - width * height :
                    Math.min(r.width - width, r.height - height);
                if (areaFit < score) {
                    bestNode = new Rectangle(width, height, r.x, r.y);
                    score = areaFit;
                }
            }

            if (!allowRotation) continue;

            // Continue to test 90-degree rotated rectangle
            if (r.width >= height && r.height >= width) {
                areaFit = (this.options.logic === PACKING_LOGIC.MAX_AREA) ?
                    r.width * r.height - height * width :
                    Math.min(r.height - width, r.width - height);
                if (areaFit < score) {
                    bestNode = new Rectangle(height, width, r.x, r.y, true); // Rotated node
                    score = areaFit;
                }
            }
        }
        return bestNode;
    }

    private splitNode (freeRect: IRectangle, usedNode: IRectangle): boolean {
        // Test if usedNode intersect with freeRect
        if (!freeRect.collide(usedNode)) return false;

        // Do vertical split
        if (usedNode.x < freeRect.x + freeRect.width && usedNode.x + usedNode.width > freeRect.x) {
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
        }

        // Do Horizontal split
        if (usedNode.y < freeRect.y + freeRect.height &&
            usedNode.y + usedNode.height > freeRect.y) {
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
        }
        return true;
    }

    private pruneFreeList () {
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

    private updateBinSize (node: IRectangle): boolean {
        if (!this.options.smart) return false;
        if (this.stage.contain(node)) return false;
        let tmpWidth: number = Math.max(this.width, node.x + node.width - this.padding + this.border);
        let tmpHeight: number = Math.max(this.height, node.y + node.height - this.padding + this.border);
        if (this.options.allowRotation) {
            // do extra test on rotated node whether it's a better choice
            const rotWidth: number = Math.max(this.width, node.x + node.height - this.padding + this.border);
            const rotHeight: number = Math.max(this.height, node.y + node.width - this.padding + this.border);
            if (rotWidth * rotHeight < tmpWidth * tmpHeight) {
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
        if (tmpWidth > this.maxWidth + this.padding || tmpHeight > this.maxHeight + this.padding) {
            return false;
        }
        this.expandFreeRects(tmpWidth + this.padding, tmpHeight + this.padding);
        this.width = this.stage.width = tmpWidth;
        this.height = this.stage.height = tmpHeight;
        return true;
    }

    private expandFreeRects (width: number, height: number) {
        this.freeRects.forEach((freeRect, index) => {
            if (freeRect.x + freeRect.width >= Math.min(this.width + this.padding - this.border, width)) {
                freeRect.width = width - freeRect.x - this.border;
            }
            if (freeRect.y + freeRect.height >= Math.min(this.height + this.padding - this.border, height)) {
                freeRect.height = height - freeRect.y - this.border;
            }
        }, this);
        this.freeRects.push(new Rectangle(
            width - this.width - this.padding,
            height - this.border * 2,
            this.width + this.padding - this.border,
            this.border));
        this.freeRects.push(new Rectangle(
            width - this.border * 2,
            height - this.height - this.padding,
            this.border,
            this.height + this.padding - this.border));
        this.freeRects = this.freeRects.filter(freeRect => {
            return !(freeRect.width <= 0 || freeRect.height <= 0 || freeRect.x < this.border || freeRect.y < this.border);
        });
        this.pruneFreeList();
    }
}
