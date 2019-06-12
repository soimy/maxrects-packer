(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.MaxRectsPacker = {}));
}(this, function (exports) { 'use strict';

    class Rectangle {
        /**
         * Creates an instance of Rectangle.
         *
         * @param {number} [width=0]
         * @param {number} [height=0]
         * @param {number} [x=0]
         * @param {number} [y=0]
         * @param {boolean} [rot=false]
         * @memberof Rectangle
         */
        constructor(width = 0, height = 0, x = 0, y = 0, rot = false) {
            /**
             * Oversized tag on rectangle which is bigger than packer itself.
             *
             * @type {boolean}
             * @memberof Rectangle
             */
            this.oversized = false;
            this._rot = false;
            this._dirty = 0;
            this._width = width;
            this._height = height;
            this._x = x;
            this._y = y;
            this._data = {};
            this._rot = rot;
        }
        /**
         * Test if two given rectangle collide each other
         *
         * @static
         * @param {Rectangle} first
         * @param {Rectangle} second
         * @returns
         * @memberof Rectangle
         */
        static Collide(first, second) { return first.collide(second); }
        /**
         * Test if the first rectangle contains the second one
         *
         * @static
         * @param {Rectangle} first
         * @param {Rectangle} second
         * @returns
         * @memberof Rectangle
         */
        static Contain(first, second) { return first.contain(second); }
        /**
         * Get the area (w * h) of the rectangle
         *
         * @returns {number}
         * @memberof Rectangle
         */
        area() { return this.width * this.height; }
        /**
         * Test if the given rectangle collide with this rectangle.
         *
         * @param {Rectangle} rect
         * @returns {boolean}
         * @memberof Rectangle
         */
        collide(rect) {
            return (rect.x < this.x + this.width &&
                rect.x + rect.width > this.x &&
                rect.y < this.y + this.height &&
                rect.y + rect.height > this.y);
        }
        /**
         * Test if this rectangle contains the given rectangle.
         *
         * @param {Rectangle} rect
         * @returns {boolean}
         * @memberof Rectangle
         */
        contain(rect) {
            return (rect.x >= this.x && rect.y >= this.y &&
                rect.x + rect.width <= this.x + this.width && rect.y + rect.height <= this.y + this.height);
        }
        get width() { return this._width; }
        set width(value) {
            if (value === this._width)
                return;
            this._width = value;
            this._dirty++;
        }
        get height() { return this._height; }
        set height(value) {
            if (value === this._height)
                return;
            this._height = value;
            this._dirty++;
        }
        get x() { return this._x; }
        set x(value) {
            if (value === this._x)
                return;
            this._x = value;
            this._dirty++;
        }
        get y() { return this._y; }
        set y(value) {
            if (value === this._y)
                return;
            this._y = value;
            this._dirty++;
        }
        /**
         * If the rectangle is rotated
         *
         * @type {boolean}
         * @memberof Rectangle
         */
        get rot() { return this._rot; }
        /**
         * Set the rotate tag of the rectangle.
         *
         * note: after `rot` is set, `width/height` of this rectangle is swaped.
         *
         * @memberof Rectangle
         */
        set rot(value) {
            if (this._rot && value)
                return;
            if (this._rot !== value) {
                const tmp = this.width;
                this.width = this.height;
                this.height = tmp;
                this._rot = value;
                this._dirty++;
            }
        }
        get data() { return this._data; }
        set data(value) {
            if (value === this._data)
                return;
            this._data = value;
            this._dirty++;
        }
        get dirty() { return this._dirty > 0; }
        setDirty(value = true) { this._dirty = value ? this._dirty + 1 : 0; }
    }

    class Bin {
        constructor() {
            this._dirty = 0;
        }
        get dirty() { return this._dirty > 0; }
        /**
         * Set bin dirty status
         *
         * @memberof Bin
         */
        setDirty(value = true) { this._dirty = value ? this._dirty + 1 : 0; }
    }

    class MaxRectsBin extends Bin {
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
            let width;
            let height;
            let data;
            let rect;
            if (args.length === 1) {
                if (typeof args[0] !== 'object')
                    throw new Error("MacrectsBin.add(): Wrong parameters");
                rect = args[0];
                width = rect.width;
                height = rect.height;
                // Check if rect.tag match bin.tag, if bin.tag not defined, it will accept any rect
                if (this.options.tag && this.tag !== rect.tag)
                    return undefined;
            }
            else {
                width = args[0];
                height = args[1];
                data = args.length > 2 ? args[2] : null;
                // Check if data.tag match bin.tag, if bin.tag not defined, it will accept any rect
                if (this.options.tag) {
                    if (data && this.tag !== data.tag)
                        return undefined;
                    if (!data && this.tag)
                        return undefined;
                }
            }
            let node = this.findNode(width + this.padding, height + this.padding);
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
                if (!rect) {
                    rect = new Rectangle(width, height, node.x, node.y, node.rot);
                    rect.data = data;
                }
                else {
                    rect.x = node.x;
                    rect.y = node.y;
                    rect.rot = node.rot;
                }
                this.rects.push(rect);
                this._dirty++;
                return rect;
            }
            else if (!this.verticalExpand) {
                if (this.updateBinSize(new Rectangle(width + this.padding, height + this.padding, this.width + this.padding - this.border, this.border))
                    || this.updateBinSize(new Rectangle(width + this.padding, height + this.padding, this.border, this.height + this.padding - this.border))) {
                    return rect ? this.add(rect) : this.add(width, height, data);
                }
            }
            else {
                if (this.updateBinSize(new Rectangle(width + this.padding, height + this.padding, 0, this.height + this.padding)) || this.updateBinSize(new Rectangle(width + this.padding, height + this.padding, this.width + this.padding, 0))) {
                    return rect ? this.add(rect) : this.add(width, height, data);
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

    class OversizedElementBin extends Bin {
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

    const EDGE_MAX_VALUE = 4096;
    class MaxRectsPacker {
        /**
         * Creates an instance of MaxRectsPacker.
         * @param {number} width of the output atlas (default is 4096)
         * @param {number} height of the output atlas (default is 4096)
         * @param {number} padding between glyphs/images (default is 0)
         * @param {IOption} [options={}] (Optional) packing options
         * @memberof MaxRectsPacker
         */
        constructor(width = EDGE_MAX_VALUE, height = EDGE_MAX_VALUE, padding = 0, options = { smart: true, pot: true, square: false, allowRotation: false, tag: false, border: 0 }) {
            this.width = width;
            this.height = height;
            this.padding = padding;
            this.options = options;
            this._currentBinIndex = 0;
            this.bins = [];
        }
        add(...args) {
            let width;
            let height;
            let data;
            if (args.length === 1) {
                if (typeof args[0] !== 'object')
                    throw new Error("MacrectsPacker.add(): Wrong parameters");
                const rect = args[0];
                if (rect.width > this.width || rect.height > this.height) {
                    this.bins.push(new OversizedElementBin(rect));
                }
                else {
                    let added = this.bins.slice(this._currentBinIndex).find(bin => bin.add(rect) !== undefined);
                    if (!added) {
                        let bin = new MaxRectsBin(this.width, this.height, this.padding, this.options);
                        if (this.options.tag && rect.tag)
                            bin.tag = rect.tag;
                        bin.add(rect);
                        this.bins.push(bin);
                    }
                }
            }
            else {
                width = args[0];
                height = args[1];
                data = args.length > 2 ? args[2] : null;
                if (width > this.width || height > this.height) {
                    this.bins.push(new OversizedElementBin(width, height, data));
                }
                else {
                    let added = this.bins.slice(this._currentBinIndex).find(bin => bin.add(width, height, data) !== undefined);
                    if (!added) {
                        let bin = new MaxRectsBin(this.width, this.height, this.padding, this.options);
                        if (this.options.tag && data.tag)
                            bin.tag = data.tag;
                        bin.add(width, height, data);
                        this.bins.push(bin);
                    }
                }
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
        addArray(rects) {
            this.sort(rects).forEach(rect => this.add(rect));
        }
        /**
         * Stop adding new element to the current bin and return a new bin.
         *
         * note: After calling `next()` all elements will no longer added to previous bins.
         *
         * @returns {Bin}
         * @memberof MaxRectsPacker
         */
        next() {
            this._currentBinIndex = this.bins.length;
            return this._currentBinIndex;
        }
        /**
         * Load bins to the packer, overwrite exist bins
         * @param {MaxRectsBin[]} bins MaxRectsBin objects
         * @memberof MaxRectsPacker
         */
        load(bins) {
            bins.forEach((bin, index) => {
                if (bin.maxWidth > this.width || bin.maxHeight > this.height) {
                    this.bins.push(new OversizedElementBin(bin.width, bin.height, {}));
                }
                else {
                    let newBin = new MaxRectsBin(this.width, this.height, this.padding, bin.options);
                    newBin.freeRects.splice(0);
                    bin.freeRects.forEach((r, i) => {
                        newBin.freeRects.push(new Rectangle(r.width, r.height, r.x, r.y));
                    });
                    newBin.width = bin.width;
                    newBin.height = bin.height;
                    this.bins[index] = newBin;
                }
            }, this);
        }
        /**
         * Output current bins to save
         * @memberof MaxRectsPacker
         */
        save() {
            let saveBins = [];
            this.bins.forEach((bin => {
                let saveBin = {
                    width: bin.width,
                    height: bin.height,
                    maxWidth: bin.maxWidth,
                    maxHeight: bin.maxHeight,
                    freeRects: [],
                    rects: [],
                    options: bin.options
                };
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
         * Sort the given rects based on longest edge
         *
         * If having same long edge, will sort second key `hash` if presented.
         *
         * @private
         * @param {T[]} rects
         * @returns
         * @memberof MaxRectsPacker
         */
        sort(rects) {
            return rects.slice().sort((a, b) => {
                const result = Math.max(b.width, b.height) - Math.max(a.width, a.height);
                if (result === 0 && a.hash && b.hash) {
                    return a.hash > b.hash ? -1 : 1;
                }
                else
                    return result;
            });
        }
        get currentBinIndex() { return this._currentBinIndex; }
    }

    exports.Bin = Bin;
    exports.MaxRectsBin = MaxRectsBin;
    exports.MaxRectsPacker = MaxRectsPacker;
    exports.OversizedElementBin = OversizedElementBin;
    exports.Rectangle = Rectangle;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=maxrects-packer.js.map
