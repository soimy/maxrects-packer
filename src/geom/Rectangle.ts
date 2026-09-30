export interface IRectangle {
    width: number;
    height: number;
    x: number;
    y: number;
    [propName: string]: any;
}

export class Rectangle implements IRectangle {
    /**
     * Oversized tag on rectangle which is bigger than packer itself.
     */
    public oversized: boolean = false;

    /**
     * Creates an instance of Rectangle.
     *
     * @param width - width of the rectangle (default is 0)
     * @param height - height of the rectangle (default is 0)
     * @param x - x position of the rectangle (default is 0)
     * @param y - y position of the rectangle (default is 0)
     * @param rot - rotation flag (default is false)
     * @param allowRotation - allow rotation flag (default is undefined)
     */
    constructor(
        width: number = 0,
        height: number = 0,
        x: number = 0,
        y: number = 0,
        rot: boolean = false,
        allowRotation: boolean | undefined = undefined
    ) {
        this._width = width;
        this._height = height;
        this._x = x;
        this._y = y;
        this._data = {};
        this._rot = rot;
        this._allowRotation = allowRotation;
    }

    /**
     * Test if two given rectangle collide each other
     *
     * @param first - first rectangle
     * @param second - second rectangle
     * @returns true if rectangles collide
     */
    public static Collide(first: IRectangle, second: IRectangle) {
        return first.collide(second);
    }

    /**
     * Test if the first rectangle contains the second one
     *
     * @param first - first rectangle
     * @param second - second rectangle
     * @returns true if first rectangle contains the second
     */
    public static Contain(first: IRectangle, second: IRectangle) {
        return first.contain(second);
    }

    /**
     * Copy a rect object without going through its setters: the prototype and every own property are
     * kept — non-enumerable ones included — so a `Rectangle` stays a `Rectangle`, a custom rect class
     * keeps its identity and its extra fields, and a plain `{width, height}` object stays plain. The
     * copy is shallow — an object held in `rect.data`, or in any custom field, is shared.
     *
     * A rect class that keeps its state out of reach of a copy — behind an ECMAScript `#private` field —
     * cannot be copied this way and has to hand out a `clone()` method instead, which is used whenever
     * it exists. That method decides how the copy is *built*, the bin's state fills in the rest, and the
     * rule between them is about what the copy already holds: what the copy defines for itself wins where
     * it is not a plain value — an accessor is how it keeps its own state (`#private` fields included), a
     * function is behaviour bound to the copy, and a non-configurable property cannot be redefined at all
     * — while plain values, and every key the copy does not define, come from the source.
     *
     * **State travels, behaviour does not.** No function is taken over from the source: one cannot be
     * classified from the outside, since a `this`-based method and a function closing over the source
     * look the same, and a wrong guess either lets a method call on a rect in the cloned bin write to the
     * original or drops a method the copy needs. Prototype methods come with the instance a `clone()`
     * returns; an own method or accessor the copy needs is that `clone()`'s to define. So a `clone()`
     * which rebuilds only the dimensions still inherits the payload, the placement, the per-item rotation
     * permission and any plain field added since construction, but not the source's own functions, and no
     * source accessor travels either — it reads and writes whatever it closed over.
     *
     * When no `clone()` exists the copy is a prototype-only shell, so every own descriptor is taken over
     * as-is, functions included: there the copy is the source's shape by construction. A rect that keeps
     * its state in an **own accessor closing over the source**, or in an own function that does, is then
     * still shared with the original and has to provide `clone()` as well. A rect whose state is simply
     * out of reach (a `#private` field) fails on the first field the copy cannot read, and that is
     * reported here rather than from inside a bin placing it.
     *
     * @param rect - the rect to copy
     * @returns a new object carrying the same own properties, or whatever `rect.clone()` returns
     */
    public static Clone<T extends IRectangle>(rect: T): T {
        const copier = (rect as { clone?: () => T }).clone;
        let copy: T;
        if (typeof copier === "function") {
            copy = copier.call(rect);
            // Typed for symbol keys as well: a rect may carry them, and they are copied like any other.
            const descriptors = Object.getOwnPropertyDescriptors(rect) as Record<string | symbol, PropertyDescriptor>;
            for (const key of Reflect.ownKeys(descriptors)) {
                const descriptor = descriptors[key];
                // An accessor never travels: the source's reads and writes the source through its closure, so
                // putting it on the copy would hand the copy the original's coordinates.
                if (!("value" in descriptor)) continue;
                const own = Object.getOwnPropertyDescriptor(copy, key);
                // What the copy defines itself wins where it is not a plain value: an accessor it built is
                // how it keeps its own state (`#private` fields included), a function is behaviour bound to
                // the copy, and a non-configurable property cannot be redefined at all. Overwriting any of
                // those would leave the copy's methods reading stale state.
                if (own && (!("value" in own) || !own.configurable || typeof own.value === "function")) continue;
                // Behaviour is the `clone()`'s business rather than the library's. A function cannot be
                // classified from the outside — a `this`-based method and one closing over the source have
                // the same shape — and a wrong guess either lets a method call on a rect in the cloned bin
                // change the original, or drops a method the copy needs. So none travels: prototype methods
                // arrive with the instance the `clone()` returns, and an own one has to be defined by it.
                if (typeof descriptor.value === "function") continue;
                // Everything else is state, and the state belongs to the bin: a `clone()` that rebuilds only
                // the dimensions leaves the constructor's defaults there (payload, per-item rotation), so
                // the source's plain values fill those in.
                Object.defineProperty(copy, key, descriptor);
            }
        } else {
            copy = Object.create(Object.getPrototypeOf(rect)) as T;
            // Descriptors rather than `Object.assign`: a rect may keep extra fields, or the backing fields
            // behind `width`/`height`, non-enumerable, and assignment would drop those silently.
            Object.defineProperties(copy, Object.getOwnPropertyDescriptors(rect));
        }
        try {
            // Every field the packing replay reads or writes, not just the size: a class backing `x`, `y`,
            // `rot` or `data` with a `#private` field passes a size-only check and then dies inside a bin.
            void copy.width;
            void copy.height;
            void copy.x;
            void copy.y;
            void copy.rot;
            void copy.data;
        } catch {
            throw new Error(
                "Rectangle.Clone(): the rect keeps its state out of reach of a copy (an ECMAScript #private field, say) — give its class a clone() method"
            );
        }
        return copy;
    }

    /**
     * Get the area (w * h) of the rectangle
     *
     * @returns The area of the rectangle
     */
    public area(): number {
        return this.width * this.height;
    }

    /**
     * Test if the given rectangle collide with this rectangle.
     *
     * @param rect - rectangle to test collision with
     * @returns true if rectangles collide
     */
    public collide(rect: IRectangle): boolean {
        return (
            rect.x < this.x + this.width &&
            rect.x + rect.width > this.x &&
            rect.y < this.y + this.height &&
            rect.y + rect.height > this.y
        );
    }

    /**
     * Test if this rectangle contains the given rectangle.
     *
     * @param rect - rectangle to test containment
     * @returns true if this rectangle contains the given rectangle
     */
    public contain(rect: IRectangle): boolean {
        return (
            rect.x >= this.x &&
            rect.y >= this.y &&
            rect.x + rect.width <= this.x + this.width &&
            rect.y + rect.height <= this.y + this.height
        );
    }

    protected _width: number;
    get width(): number {
        return this._width;
    }
    set width(value: number) {
        if (value === this._width) return;
        this._width = value;
        this._dirty++;
    }

    protected _height: number;
    get height(): number {
        return this._height;
    }
    set height(value: number) {
        if (value === this._height) return;
        this._height = value;
        this._dirty++;
    }

    protected _x: number;
    get x(): number {
        return this._x;
    }
    set x(value: number) {
        if (value === this._x) return;
        this._x = value;
        this._dirty++;
    }

    protected _y: number;
    get y(): number {
        return this._y;
    }
    set y(value: number) {
        if (value === this._y) return;
        this._y = value;
        this._dirty++;
    }

    protected _rot: boolean = false;

    /**
     * If the rectangle is rotated
     */
    get rot(): boolean {
        return this._rot;
    }

    /**
     * Set the rotate tag of the rectangle.
     *
     * note: after `rot` is set, `width/height` of this rectangle is swaped.
     */
    set rot(value: boolean) {
        if (this._allowRotation === false) return;

        if (this._rot !== value) {
            const tmp = this.width;
            this.width = this.height;
            this.height = tmp;
            this._rot = value;
            this._dirty++;
        }
    }

    protected _allowRotation: boolean | undefined = undefined;

    /**
     * If the rectangle allow rotation
     */
    get allowRotation(): boolean | undefined {
        return this._allowRotation;
    }

    /**
     * Set the allowRotation tag of the rectangle.
     */
    set allowRotation(value: boolean | undefined) {
        if (this._allowRotation !== value) {
            this._allowRotation = value;
            this._dirty++;
        }
    }

    protected _data: any;
    get data(): any {
        return this._data;
    }
    set data(value: any) {
        if (value === null || value === this._data) return;
        this._data = value;
        // extract allowRotation settings
        if (typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "allowRotation")) {
            this._allowRotation = value.allowRotation;
        }
        this._dirty++;
    }

    protected _dirty: number = 0;
    get dirty(): boolean {
        return this._dirty > 0;
    }
    public setDirty(value: boolean = true): void {
        this._dirty = value ? this._dirty + 1 : 0;
    }
}
