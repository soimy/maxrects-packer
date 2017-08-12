"use strict";

const OversizedElementBin = require("./oversized_element_bin");
const MaxRectsBin = require("./maxrects_bin");
const EDGE_MAX_VALUE = 4096;

module.exports = class MaxRectsPacker {
  /**
   * Creates an instance of MaxRectsPacker.
   * @param {number} width of the output atlas (default is 4096)
   * @param {number} height of the output atlas (default is 4096) 
   * @param {number} padding between glyphs/images (default is 0) 
   */
  constructor(width, height, padding) {
    this.maxWidth = width || EDGE_MAX_VALUE;
    this.maxHeight = height || EDGE_MAX_VALUE;
    this.padding = padding || 0;
    this.bins = [];
  }
  
  /**
   * Add a bin/rectangle object with data to packer
   * 
   * @param {number} width of the input bin/rectangle
   * @param {number} height of the input bin/rectangle 
   * @param {Object} data custom data object 
   */
  add(width, height, data) {
    if (width > this.maxWidth || height > this.maxHeight) {
      this.bins.push(new OversizedElementBin(width, height, data));
    } else {
      let added = this.bins.find(bin => bin.add(width, height, data));
      if (!added) {
        let bin = new MaxRectsBin(this.maxWidth, this.maxHeight, this.padding);
        bin.add(width, height, data);
        this.bins.push(bin);
      }
    }
  }
  
  /**
   * (Internal)Sort the pushed bins with max width/height for better performence
   * 
   * @param {any} rects 
   * @returns 
   */
  sort(rects) {
    return rects.slice().sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));
  }
  
  /**
   * Add an Array of bins/rectangles to the packer.
   * Object structure: { width, height, data } 
   * 
   * @param {Array.<Object>} rects 
   */
  addArray(rects) {
    this.sort(rects).forEach(rect => this.add(rect.width, rect.height, rect.data));
  }
}
