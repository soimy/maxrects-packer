/**
 * What `add()` and `addArray()` accept: any object carrying `width` and `height`.
 *
 * A caller supplies the size, and the packer writes the placement onto that very object, so `x`, `y`,
 * `rot` and `oversized` are deliberately absent here — {@link IRectangle} is the placed shape, and
 * requiring its coordinates up front is what made a plain `{ width, height }` object fail to compile
 * (issue #46). The index signature is what lets an object keep the fields of its own class, so the
 * rect that comes back out of a bin is still that class.
 */
export interface IRectangleInput {
    width: number;
    height: number;
    [propName: string]: any;
}

/**
 * What `toJSON()` returns: the placed rect's public shape (issue #53).
 *
 * `width`, `height`, `x`, `y` and `rot` are always present. The rest are optional because they are only
 * written when they carry something: `oversized` when the packer tagged the rect, `allowRotation` when
 * the rect has an explicit override, `data` when the payload is not the constructor's `{}` placeholder.
 * The index signature leaves room for a subclass's own fields, which are serialized as well.
 *
 * The shape satisfies {@link IRectangleInput}, so the result of `JSON.parse(JSON.stringify(rect))` can be
 * handed straight back to `addArray()`.
 */
export interface IRectangleJSON extends IRectangleInput {
    x: number;
    y: number;
    rot: boolean;
    oversized?: boolean;
    allowRotation?: boolean;
}

/**
 * A rect the packer has placed: an {@link IRectangleInput} plus the `x`/`y` the packer wrote onto it.
 */
export interface IRectangle extends IRectangleInput {
    x: number;
    y: number;
}

/**
 * The own keys of `object`, string keys first and symbol keys after — the order `Reflect.ownKeys`
 * uses, without `Reflect`, which is ES2015. The published bundle promises no engine requirement
 * beyond ES5, and `target: es5` downlevels syntax rather than runtime APIs, so the language call
 * would stay in the bundle and throw on an ES5 engine. The symbol half is feature-checked: an engine
 * without `Object.getOwnPropertySymbols` has no symbol keys to report.
 * @param object - the object whose own keys are listed
 * @returns its own keys, the string keys then the symbol keys
 */
function ownKeys(object: object): (string | symbol)[] {
    const keys: (string | symbol)[] = Object.getOwnPropertyNames(object);
    if (typeof Object.getOwnPropertySymbols === "function") {
        keys.push(...Object.getOwnPropertySymbols(object));
    }
    return keys;
}

/**
 * The own property descriptors of `object`, keyed as `Object.getOwnPropertyDescriptors` keys them —
 * which is ES2017, and so out of reach of the published ES5 promise for the same reason as
 * `Reflect.ownKeys` above. `Object.getOwnPropertyNames` and `Object.getOwnPropertyDescriptor` are
 * both ES5, and symbol keys are copied as well, so a copy still carries the source's whole shape.
 * @param object - the object whose own descriptors are read
 * @returns its own descriptors, keyed by string and symbol
 */
function ownPropertyDescriptors(object: object): Record<string | symbol, PropertyDescriptor> {
    // Null-prototype: `descriptors[key] = …` on an ordinary object would send an own `__proto__` key to
    // the inherited `Object.prototype.__proto__` setter, which repoints the prototype instead of
    // creating an own entry — so `ownKeys()` would never list it and a rect carrying that field (one
    // out of `JSON.parse`, say) would silently lose it. `Object.getOwnPropertyDescriptors` defines its
    // result with `CreateDataProperty` and keeps the key, which is what this has to match.
    const descriptors = Object.create(null) as Record<string | symbol, PropertyDescriptor>;
    for (const key of ownKeys(object)) {
        // `ownKeys` lists own keys only, and an own key always has a descriptor.
        descriptors[key] = Object.getOwnPropertyDescriptor(object, key) as PropertyDescriptor;
    }
    return descriptors;
}

/**
 * The class's own backing fields, by name: what `toJSON()` drops in favour of the public getters.
 *
 * An exact list rather than "every key starting with `_`", because the underscore is a naming convention
 * the caller may use too. `IRectangleInput` allows arbitrary custom fields and the serialization contract
 * keeps them all, so dropping the whole namespace would silently discard a caller's `_assetId` or a
 * subclass's `_meta`.
 */
const BACKING_FIELDS: Record<string, true> = {
    _width: true,
    _height: true,
    _x: true,
    _y: true,
    _rot: true,
    _allowRotation: true,
    _data: true,
    _defaultData: true,
    _dirty: true
};

/**
 * Whether a payload the constructor installed is still a plain, empty object with its original prototype.
 *
 * The caller has already established identity, so the value is the `{}` the constructor put there and
 * there is nothing to say about its type; that is why the parameter is an `object`. What identity cannot
 * see is a placeholder mutated where it stands, which is the whole job here: an added key, or a prototype
 * replaced with one that serializes itself, both leave identity intact.
 * @param data - the payload to test, already known to be the object the constructor installed
 * @returns true when it is a plain empty object that still has its original prototype
 */
function isPlainEmptyObject(data: object): boolean {
    return Object.getPrototypeOf(data) === Object.prototype && ownKeys(data).length === 0;
}

export class Rectangle implements IRectangle {
    /**
     * Oversized tag on a rect the packer could not put in a bin: one bigger than the packer itself, or
     * one no bin could grow to hold (`square` caps a bin below `maxHeight`, say).
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
        this._defaultData = this._data;
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
     * @returns a new object carrying the same own values as the source, built on whatever `rect.clone()`
     * returns when the rect class has one
     */
    public static Clone<T extends IRectangleInput>(rect: T): T {
        const copier = (rect as { clone?: () => T }).clone;
        let copy: T;
        if (typeof copier === "function") {
            copy = copier.call(rect);
            // Typed for symbol keys as well: a rect may carry them, and they are copied like any other.
            const descriptors = ownPropertyDescriptors(rect);
            for (const key of ownKeys(descriptors)) {
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
            Object.defineProperties(copy, ownPropertyDescriptors(rect));
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
     * The public shape of this rect, for `JSON.stringify()` (issue #53).
     *
     * Without this, `JSON.stringify(rect)` walked the own properties and emitted the backing fields —
     * `{"oversized":false,"_rot":false,"_dirty":1,"_width":10,"_height":20,"_x":0,"_y":0,"_data":{}}` —
     * so a `Rectangle` serialized differently from the equivalent plain `{ width, height }` object the
     * packer also accepts. `data` is the caller's payload and belongs in the output; the internal dirty
     * counter does not.
     *
     * The shape is the placed rect: `width`, `height`, `x`, `y` and `rot`, in that order. `oversized` is
     * added only when set, `data` only when it is not the constructor's own untouched `{}` placeholder —
     * a `{}` the caller assigned is a value, and so is a `null` — and `allowRotation` only when the rect
     * carries an explicit override, since a plain object may state it as a field. Any other own field is
     * kept as well, so a subclass or a rect carrying custom state still serializes whole; the class's own
     * backing fields are the only thing dropped, by name, so a caller's `_assetId` survives.
     *
     * @returns the rect's own fields, with the backing fields replaced by the public ones
     */
    public toJSON(): IRectangleJSON {
        // The geometry goes in first so the key order is fixed rather than however the caller happened to
        // assign fields, and so the documented example reads the way it is written. `width`, `height`,
        // `x`, `y`, `rot`, `data` and `allowRotation` are prototype accessors and never own keys; the own
        // keys are the backing fields plus `oversized` plus whatever the caller (or a subclass) added.
        const json: Record<string, any> = {
            width: this.width,
            height: this.height,
            x: this.x,
            y: this.y,
            rot: this.rot
        };
        // The backing fields are skipped by name — the public value is read from the getter instead — and
        // everything else is kept, so custom state still serializes.
        for (const key of ownKeys(this)) {
            // `hasOwnProperty` rather than `BACKING_FIELDS[key]`: the latter also reads the prototype chain,
            // so a caller's own `toString` or `constructor` field would match an inherited function and be
            // dropped as if it were a backing field.
            if (typeof key !== "string" || Object.prototype.hasOwnProperty.call(BACKING_FIELDS, key)) continue;
            // A tag the packer sets, so it is absent rather than `false` on a normal rect.
            if (key === "oversized" && !this.oversized) continue;
            // An own `__proto__` field is the one name `json[key] = …` cannot record: the assignment reaches
            // the inherited accessor and repoints the result's prototype instead of adding the field. Every
            // other name assigns normally, `toString` included.
            if (key === "__proto__") {
                Object.defineProperty(json, key, {
                    value: (this as Record<string, any>)[key],
                    enumerable: true,
                    configurable: true,
                    writable: true
                });
                continue;
            }
            json[key] = (this as Record<string, any>)[key];
        }
        // `data` is the caller's payload, so it travels. Only the constructor's own untouched `{}` is the
        // absence of one, which takes two tests that cover different things — each has already been deleted
        // once as redundant, and each time that lost caller data.
        const data = this.data;
        // Identity first, and that order is worth keeping: the shape test enumerates keys, so testing it
        // first would scan every payload the caller supplied — and a payload can be a large object — only
        // to discard the answer. Identity is also the only test that sees a `{}` the caller wrote, through
        // the setter or by assigning the protected field from a subclass, because such an object looks
        // exactly like the placeholder.
        //
        // Shape second, for the one thing identity cannot see: a placeholder mutated where it stands, by an
        // added key or by a prototype replaced with one that serializes itself.
        if (!(data === this._defaultData && isPlainEmptyObject(data))) json.data = data;
        // The per-item rotation override is an accessor here but a plain field on the objects the packer
        // also accepts, so it has to be written back out or the two rect kinds would not serialize alike.
        // `undefined` is the absence of an override rather than one, so it stays absent.
        const allowRotation = this.allowRotation;
        if (allowRotation !== undefined) json.allowRotation = allowRotation;
        return json as IRectangleJSON;
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
    /**
     * The `{}` the constructor installed as `_data`, held so `toJSON()` can recognise that very object.
     *
     * A flag cleared by the setter cannot do this job: a subclass may assign the protected `_data` field
     * directly, which leaves the flag set while the payload is already the subclass's. An object the
     * caller wrote is shape-identical to the placeholder, so identity is the only thing that tells them
     * apart.
     */
    protected _defaultData: any;
    /** Opaque caller payload, including explicit null. Objects may also supply allowRotation. */
    get data(): any {
        return this._data;
    }
    set data(value: any) {
        if (value === this._data) return;
        this._data = value;
        // extract allowRotation settings
        if (
            value !== null &&
            typeof value === "object" &&
            Object.prototype.hasOwnProperty.call(value, "allowRotation")
        ) {
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
