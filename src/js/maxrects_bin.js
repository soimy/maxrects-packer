"use strict";

const EDGE_MAX_VALUE = 4096;
const EDGE_MIN_VALUE = 128;

module.exports = class MaxRectsBin {
  constructor(maxWidth, maxHeight, padding, options = {}) {
    this.options = {};
    this.options.smart = options.smart !== undefined ? options.smart : true;
    this.options.pot = options.pot !== undefined ? options.pot : true;
    this.options.square = options.square !== undefined ? options.square : true;
    this.maxWidth = maxWidth || EDGE_MAX_VALUE;
    this.maxHeight = maxHeight || EDGE_MAX_VALUE;
    this.padding = padding || 0;
    this.width = options.smart ? 0 : maxWidth;
    this.height = options.smart ? 0 : maxHeight;
    this.freeRects = [];
    this.freeRects.push({ 
      x: 0, 
      y: 0, 
      width: maxWidth + this.padding, 
      height: maxHeight + this.padding
    });
    this.rects = [];
    this.verticalExpand = false;
  }
  
  add(width, height, data) {
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
      let rect = {width: width, height: height, x: node.x, y: node.y, data};
      this.rects.push(rect);
      return rect;
    } else if (!this.verticalExpand) {
      if (this.updateBinSize({
          x: this.width + this.padding,
          y: 0,
          width: width + this.padding,
          height: height + this.padding
        }) || this.updateBinSize({
          x: 0,
          y: this.height + this.padding,
          width: width + this.padding,
          height: height + this.padding
        })) {
        return this.add(width, height, data);
      }
    } else {
      if (this.updateBinSize({
        x: 0,
        y: this.height + this.padding,
        width: width + this.padding,
        height: height + this.padding
      }) || this.updateBinSize({
        x: this.width + this.padding,
        y: 0,
        width: width + this.padding,
        height: height + this.padding
      })) {
        return this.add(width, height, data);
      }
    }
    return undefined;
  }
  
  /**
  * Internal
  **/
  
  findNode(width, height) {
    let score = Number.MAX_SAFE_INTEGER;
    let areaFit, r, bestNode;
    for (let i = 0; i < this.freeRects.length; i++) {
      r = this.freeRects[i];
      if (r.width >= width && r.height >= height) {
        areaFit = r.width * r.height - width * height;
        if (areaFit < score) {
          bestNode = {};
          bestNode.x = r.x;
          bestNode.y = r.y;
          bestNode.width = width;
          bestNode.height = height;
          score = areaFit;
        }
      }
    }
    return bestNode;
  }
  
  splitNode(freeRect, usedNode) {
    // Test if usedNode intersect with freeRect
    if (usedNode.x >= freeRect.x + freeRect.width ||
      usedNode.x + usedNode.width <= freeRect.x ||
      usedNode.y >= freeRect.y + freeRect.height ||
      usedNode.y + usedNode.height <= freeRect.y) {
        return false;
    }
    // DO vertical split
    if (usedNode.x < freeRect.x + freeRect.width &&
        usedNode.x + usedNode.width > freeRect.x) {
      // New node at the top side of the used node.
      if (usedNode.y > freeRect.y && usedNode.y < freeRect.y + freeRect.height) {
        let newNode = {};
        newNode.x = freeRect.x;
        newNode.y = freeRect.y;
        newNode.width = freeRect.width;
        newNode.height = usedNode.y - freeRect.y;
        this.freeRects.push(newNode);
      }
      // New node at the bottom side of the used node.
      if (usedNode.y + usedNode.height < freeRect.y + freeRect.height) {
        let newNode = {};
        newNode.x = freeRect.x;
        newNode.width = freeRect.width;
        newNode.y = usedNode.y + usedNode.height;
        newNode.height = freeRect.y + freeRect.height - (usedNode.y + usedNode.height);
        this.freeRects.push(newNode);
      }
    }
    // DO Horizontal split
    if (usedNode.y < freeRect.y + freeRect.height &&
      usedNode.y + usedNode.height > freeRect.y) {
      // New node at the left side of the used node.
      if (usedNode.x > freeRect.x && usedNode.x < freeRect.x + freeRect.width) {
        let newNode = {};
        newNode.x = freeRect.x;
        newNode.y = freeRect.y;
        newNode.height = freeRect.height;
        newNode.width = usedNode.x - freeRect.x;
        this.freeRects.push(newNode);
      }
      // New node at the right side of the used node.
      if (usedNode.x + usedNode.width < freeRect.x + freeRect.width) {
        let newNode = {};
        newNode.y = freeRect.y;
        newNode.height = freeRect.height;
        newNode.x = usedNode.x + usedNode.width;
        newNode.width = freeRect.x + freeRect.width - (usedNode.x + usedNode.width);
        this.freeRects.push(newNode);
      }
    }
    return true;
  }
        
  pruneFreeList() {
    // Go through each pair of freeRects and remove any rects that is redundant.
    let i = 0;
    let j = 0;
    let len = this.freeRects.length;
    while (i < len) {
      j = i + 1;
      let tmpRect1 = this.freeRects[i];
      while (j < len) {
        let tmpRect2 = this.freeRects[j];
        if (this.isContained(tmpRect1, tmpRect2)) {
          this.freeRects.splice(i, 1);
          i--;
          len--;
          break;
        }
        if (this.isContained(tmpRect2, tmpRect1)) {
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
    if (!this.options.smart) return false; 
    if (this.isContained(node)) return false; 
    let tmpWidth = Math.max(this.width, node.x + node.width - this.padding);
    let tmpHeight = Math.max(this.height, node.y + node.height - this.padding);
    if (this.options.pot) {
      tmpWidth = Math.pow(2, Math.ceil(Math.log2(tmpWidth)));
      tmpHeight = Math.pow(2, Math.ceil(Math.log2(tmpHeight)));
    }
    if (this.options.square) {
      tmpWidth = tmpHeight = Math.max(tmpWidth , tmpHeight);
    }
    if (tmpWidth > this.maxWidth + this.padding || 
        tmpHeight > this.maxHeight + this.padding) {
      return false;
    }
    this.expandFreeRects(tmpWidth + this.padding, tmpHeight + this.padding);
    this.width = tmpWidth;
    this.height = tmpHeight;
    return true;
  }
  
  isContained (a, b = {x:0, y:0, width:this.width, height:this.height}) {
    return a.x >= b.x && a.y >= b.y	&& a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height;
  }

  expandFreeRects(width, height) {
    this.freeRects.forEach((freeRect, index) => {
      if(freeRect.x + freeRect.width >= Math.min(this.width + this.padding, width)) {
        freeRect.width = width - freeRect.x;
      }
      if(freeRect.y + freeRect.height >= Math.min(this.height + this.padding, height)) {
        freeRect.height = height - freeRect.y;
      }
    }, this);
    this.freeRects.push({
      x: this.width + this.padding,
      y: 0,
      width: width - this.width - this.padding,
      height: height
    });
    this.freeRects.push({
      x: 0,
      y: this.height + this.padding,
      width: width,
      height: height - this.height - this.padding
    });
    this.freeRects.forEach((freeRect, index) => {
      if(freeRect.width <= 0 || freeRect.height <= 0) {
        this.freeRects.splice(index, 1);
      }
    }, this);
    this.pruneFreeList();
  }
}
      