"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var maxrects_packer_1 = require("./maxrects_packer");
var Rectangle_1 = require("./geom/Rectangle");
var abstract_bin_1 = require("./abstract_bin");
var MaxRectsBin = /** @class */ (function (_super) {
    __extends(MaxRectsBin, _super);
    function MaxRectsBin(maxWidth, maxHeight, padding, options) {
        if (maxWidth === void 0) { maxWidth = maxrects_packer_1.EDGE_MAX_VALUE; }
        if (maxHeight === void 0) { maxHeight = maxrects_packer_1.EDGE_MAX_VALUE; }
        if (padding === void 0) { padding = 0; }
        if (options === void 0) { options = { smart: true, pot: true, square: true }; }
        var _this = _super.call(this) || this;
        _this.maxWidth = maxWidth;
        _this.maxHeight = maxHeight;
        _this.padding = padding;
        _this.options = options;
        _this.verticalExpand = false;
        _this.width = _this.options.smart ? 0 : maxWidth;
        _this.height = _this.options.smart ? 0 : maxHeight;
        _this.freeRects.push(new Rectangle_1.Rectangle(0, 0, _this.maxWidth + _this.padding, _this.maxHeight + _this.padding));
        return _this;
    }
    MaxRectsBin.prototype.add = function (width, height, data) {
        var node = this.findNode(width + this.padding, height + this.padding);
        if (node) {
            this.updateBinSize(node);
            var numRectToProcess = this.freeRects.length;
            var i = 0;
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
            var rect = new Rectangle_1.Rectangle(node.x, node.y, width, height);
            rect.data = data;
            this.rects.push(rect);
            return rect;
        }
        else if (!this.verticalExpand) {
            if (this.updateBinSize(new Rectangle_1.Rectangle(this.width + this.padding, 0, width + this.padding, height + this.padding))
                || this.updateBinSize(new Rectangle_1.Rectangle(0, this.height + this.padding, width + this.padding, height + this.padding))) {
                return this.add(width, height, data);
            }
        }
        else {
            if (this.updateBinSize(new Rectangle_1.Rectangle(0, this.height + this.padding, width + this.padding, height + this.padding)) || this.updateBinSize(new Rectangle_1.Rectangle(this.width + this.padding, 0, width + this.padding, height + this.padding))) {
                return this.add(width, height, data);
            }
        }
        return undefined;
    };
    MaxRectsBin.prototype.findNode = function (width, height) {
        var score = Number.MAX_VALUE;
        var areaFit;
        var r;
        var bestNode = new Rectangle_1.Rectangle();
        for (var i in this.freeRects) {
            r = this.freeRects[i];
            if (r.width >= width && r.height >= height) {
                areaFit = r.width * r.height - width * height;
                if (areaFit < score) {
                    bestNode.x = r.x;
                    bestNode.y = r.y;
                    bestNode.width = width;
                    bestNode.height = height;
                    score = areaFit;
                }
            }
        }
        return bestNode;
    };
    MaxRectsBin.prototype.splitNode = function (freeRect, usedNode) {
        // Test if usedNode intersect with freeRect
        if (freeRect.collide(usedNode))
            return false;
        // Do vertical split
        if (usedNode.x < freeRect.x + freeRect.width && usedNode.x + usedNode.width > freeRect.x) {
            // New node at the top side of the used node
            if (usedNode.y > freeRect.y && usedNode.y < freeRect.y + freeRect.height) {
                var newNode = new Rectangle_1.Rectangle(freeRect.x, freeRect.y, freeRect.width, usedNode.y - freeRect.y);
                this.freeRects.push(newNode);
            }
            // New node at the bottom side of the used node
            if (usedNode.y + usedNode.height < freeRect.y + freeRect.height) {
                var newNode = new Rectangle_1.Rectangle(freeRect.x, usedNode.y + usedNode.height, freeRect.width, freeRect.y + freeRect.height - (usedNode.y + usedNode.height));
                this.freeRects.push(newNode);
            }
        }
        // Do Horizontal split
        if (usedNode.y < freeRect.y + freeRect.height &&
            usedNode.y + usedNode.height > freeRect.y) {
            // New node at the left side of the used node.
            if (usedNode.x > freeRect.x && usedNode.x < freeRect.x + freeRect.width) {
                var newNode = new Rectangle_1.Rectangle(freeRect.x, freeRect.y, usedNode.x - freeRect.x, freeRect.height);
                this.freeRects.push(newNode);
            }
            // New node at the right side of the used node.
            if (usedNode.x + usedNode.width < freeRect.x + freeRect.width) {
                var newNode = new Rectangle_1.Rectangle(usedNode.x + usedNode.width, freeRect.y, freeRect.x + freeRect.width - (usedNode.x + usedNode.width), freeRect.height);
                this.freeRects.push(newNode);
            }
        }
        return true;
    };
    MaxRectsBin.prototype.pruneFreeList = function () {
        // Go through each pair of freeRects and remove any rects that is redundant
        var i = 0;
        var j = 0;
        var len = this.freeRects.length;
        while (j < len) {
            j = i + 1;
            var tmpRect1 = this.freeRects[i];
            while (j < len) {
                var tmpRect2 = this.freeRects[j];
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
    };
    MaxRectsBin.prototype.updateBinSize = function (node) {
        if (!this.options.smart)
            return false;
        if (!new Rectangle_1.Rectangle(0, 0, this.width, this.height).contain(node))
            return false;
        var tmpWidth = Math.max(this.maxWidth, node.x + node.width - this.padding);
        var tmpHeight = Math.max(this.maxHeight, node.y + node.height - this.padding);
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
        this.width = tmpWidth;
        this.height = tmpHeight;
        return true;
    };
    MaxRectsBin.prototype.expandFreeRects = function (width, height) {
        var _this = this;
        this.freeRects.forEach(function (freeRect, index) {
            if (freeRect.x + freeRect.width >= Math.min(_this.width + _this.padding, width)) {
                freeRect.width = width - freeRect.x;
            }
            if (freeRect.y + freeRect.height >= Math.min(_this.height + _this.padding, height)) {
                freeRect.height = height - freeRect.y;
            }
        }, this);
        this.freeRects.push(new Rectangle_1.Rectangle(this.width + this.padding, 0, width - this.width - this.padding, height));
        this.freeRects.push(new Rectangle_1.Rectangle(0, this.height + this.padding, width, height - this.height - this.padding));
        this.freeRects.forEach(function (freeRect, index) {
            if (freeRect.width <= 0 || freeRect.height <= 0) {
                _this.freeRects.splice(index, 1);
            }
        }, this);
        this.pruneFreeList();
    };
    return MaxRectsBin;
}(abstract_bin_1.Bin));
exports.default = MaxRectsBin;
//# sourceMappingURL=maxrects_bin.js.map