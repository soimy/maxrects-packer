export class Bin {
    constructor() {
        this._dirty = 0;
    }
    /**
     * Check if the bin is dirty/changed
     *
     * @returns {boolean}
     * @memberof Bin
     */
    isDirty() {
        return this._dirty > 0;
    }
    /**
     * Set bin dirty
     *
     * @memberof Bin
     */
    setDirty() {
        this._dirty++;
    }
    /**
     * Reset bin dirty status
     *
     * @memberof Bin
     */
    resetDirty() {
        this._dirty = 0;
    }
}
//# sourceMappingURL=abstract-bin.js.map