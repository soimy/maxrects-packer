export class Bin {
    constructor() {
        this._dirty = 0;
    }
    get dirty() { return this._dirty > 0 || this.rects.some(rect => rect.dirty); }
    /**
     * Set bin dirty status
     *
     * @memberof Bin
     */
    setDirty(value = true) {
        this._dirty = value ? this._dirty + 1 : 0;
        if (!value)
            for (let rect of this.rects)
                rect.setDirty(false);
    }
}
//# sourceMappingURL=abstract-bin.js.map