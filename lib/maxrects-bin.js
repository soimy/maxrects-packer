import { EDGE_MAX_VALUE } from "./maxrects-packer";
import { Rectangle } from "./geom/Rectangle";
import { Bin } from "./abstract-bin";
export class MaxRectsBin extends Bin {
    constructor(maxWidth = EDGE_MAX_VALUE, maxHeight = EDGE_MAX_VALUE, padding = 0, options = { smart: true, pot: true, square: true, allowRotation: false, tag: false, border: 0 }) {
        super();
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
        this.padding = padding;
        this.options = options;
        this.freeRects = [];
        this.rects = [];
        this.verticalExpand = false;
        this.width = this.options.smart ? 0 : maxWidth;
        this.height = this.options.smart ? 0 : maxHeight;
        this.border = this.options.border ? this.options.border : 0;
        this.freeRects.push(new Rectangle(this.maxWidth + this.padding - this.border * 2, this.maxHeight + this.padding - this.border * 2, this.border, this.border));
        this.stage = new Rectangle(this.width, this.height);
    }
    add(...args) {
        let data;
        let rect;
        if (args.length === 1) {
            if (typeof args[0] !== 'object')
                throw new Error("MacrectsBin.add(): Wrong parameters");
            rect = args[0];
            // Check if rect.tag match bin.tag, if bin.tag not defined, it will accept any rect
            if (this.options.tag && this.tag !== rect.tag)
                return undefined;
        }
        else {
            data = args.length > 2 ? args[2] : null;
            // Check if data.tag match bin.tag, if bin.tag not defined, it will accept any rect
            if (this.options.tag) {
                if (data && this.tag !== data.tag)
                    return undefined;
                if (!data && this.tag)
                    return undefined;
            }
            rect = new Rectangle(args[0], args[1]);
            rect.data = data;
            rect.setDirty(false);
        }
        const result = this.process(rect);
        if (result)
            this.rects.push(result);
        return result;
    }
    repack() {
        let unpacked = [];
        this.reset();
        // re-sort rects from big to small
        this.rects.sort((a, b) => {
            const result = Math.max(b.width, b.height) - Math.max(a.width, a.height);
            if (result === 0 && a.hash && b.hash) {
                return a.hash > b.hash ? -1 : 1;
            }
            else
                return result;
        });
        for (let rect of this.rects) {
            if (!this.process(rect)) {
                unpacked.push(rect);
            }
        }
        for (let rect of unpacked)
            this.rects.splice(this.rects.indexOf(rect), 1);
        return unpacked.length > 0 ? unpacked : undefined;
    }
    reset(deepReset = false) {
        if (deepReset) {
            if (this.data)
                delete this.data;
            if (this.tag)
                delete this.tag;
            this.rects = [];
            this.options = {
                smart: true,
                pot: true,
                square: true,
                allowRotation: false,
                tag: false,
                border: 0
            };
        }
        this.width = this.options.smart ? 0 : this.maxWidth;
        this.height = this.options.smart ? 0 : this.maxHeight;
        this.border = this.options.border ? this.options.border : 0;
        this.freeRects = [new Rectangle(this.maxWidth + this.padding - this.border * 2, this.maxHeight + this.padding - this.border * 2, this.border, this.border)];
        this.stage = new Rectangle(this.width, this.height);
        this._dirty = 0;
    }
    process(rect) {
        let node = this.findNode(rect.width + this.padding, rect.height + this.padding);
        if (node) {
            this.updateBinSize(node);
            let numRectToProcess = this.freeRects.length;
            let i = 0;
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
            rect.rot = node.rot;
            this._dirty++;
            return rect;
        }
        else if (!this.verticalExpand) {
            if (this.updateBinSize(new Rectangle(rect.width + this.padding, rect.height + this.padding, this.width + this.padding - this.border, this.border))
                || this.updateBinSize(new Rectangle(rect.width + this.padding, rect.height + this.padding, this.border, this.height + this.padding - this.border))) {
                return this.process(rect);
            }
        }
        else {
            if (this.updateBinSize(new Rectangle(rect.width + this.padding, rect.height + this.padding, 0, this.height + this.padding)) || this.updateBinSize(new Rectangle(rect.width + this.padding, rect.height + this.padding, this.width + this.padding, 0))) {
                return this.process(rect);
            }
        }
        return undefined;
    }
    findNode(width, height) {
        let score = Number.MAX_VALUE;
        let areaFit;
        let r;
        let bestNode;
        for (let i in this.freeRects) {
            r = this.freeRects[i];
            if (r.width >= width && r.height >= height) {
                areaFit = r.width * r.height - width * height;
                if (areaFit < score) {
                    bestNode = new Rectangle(width, height, r.x, r.y);
                    score = areaFit;
                }
            }
            if (!this.options.allowRotation)
                continue;
            // Continue to test 90-degree rotated rectangle
            if (r.width >= height && r.height >= width) {
                areaFit = r.width * r.height - height * width;
                if (areaFit < score) {
                    bestNode = new Rectangle(width, height, r.x, r.y, true); // Rotated node
                    score = areaFit;
                }
            }
        }
        return bestNode;
    }
    splitNode(freeRect, usedNode) {
        // Test if usedNode intersect with freeRect
        if (!freeRect.collide(usedNode))
            return false;
        // Do vertical split
        if (usedNode.x < freeRect.x + freeRect.width && usedNode.x + usedNode.width > freeRect.x) {
            // New node at the top side of the used node
            if (usedNode.y > freeRect.y && usedNode.y < freeRect.y + freeRect.height) {
                let newNode = new Rectangle(freeRect.width, usedNode.y - freeRect.y, freeRect.x, freeRect.y);
                this.freeRects.push(newNode);
            }
            // New node at the bottom side of the used node
            if (usedNode.y + usedNode.height < freeRect.y + freeRect.height) {
                let newNode = new Rectangle(freeRect.width, freeRect.y + freeRect.height - (usedNode.y + usedNode.height), freeRect.x, usedNode.y + usedNode.height);
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
                let newNode = new Rectangle(freeRect.x + freeRect.width - (usedNode.x + usedNode.width), freeRect.height, usedNode.x + usedNode.width, freeRect.y);
                this.freeRects.push(newNode);
            }
        }
        return true;
    }
    pruneFreeList() {
        // Go through each pair of freeRects and remove any rects that is redundant
        let i = 0;
        let j = 0;
        let len = this.freeRects.length;
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
    updateBinSize(node) {
        if (!this.options.smart)
            return false;
        if (this.stage.contain(node))
            return false;
        let tmpWidth = Math.max(this.width, node.x + node.width - this.padding + this.border);
        let tmpHeight = Math.max(this.height, node.y + node.height - this.padding + this.border);
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
    expandFreeRects(width, height) {
        this.freeRects.forEach((freeRect, index) => {
            if (freeRect.x + freeRect.width >= Math.min(this.width + this.padding - this.border, width)) {
                freeRect.width = width - freeRect.x - this.border;
            }
            if (freeRect.y + freeRect.height >= Math.min(this.height + this.padding - this.border, height)) {
                freeRect.height = height - freeRect.y - this.border;
            }
        }, this);
        this.freeRects.push(new Rectangle(width - this.width - this.padding, height - this.border * 2, this.width + this.padding - this.border, this.border));
        this.freeRects.push(new Rectangle(width - this.border * 2, height - this.height - this.padding, this.border, this.height + this.padding - this.border));
        this.freeRects = this.freeRects.filter(freeRect => {
            return !(freeRect.width <= 0 || freeRect.height <= 0 || freeRect.x < this.border || freeRect.y < this.border);
        });
        this.pruneFreeList();
    }
}
//# sourceMappingURL=maxrects-bin.js.map