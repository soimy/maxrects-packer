export class Bin {
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
//# sourceMappingURL=abstract-bin.js.map