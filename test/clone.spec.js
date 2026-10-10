import { describe, expect, test } from "vitest";
import { MaxRectsBin } from "../src/maxrects-bin";
import { Rectangle } from "../src/geom/Rectangle";

// `clone()` on both bin types: what the copy shares with its source, what it owns, and what a custom
// `clone()` on a rect class decides. Kept apart from the bin specs because the rule has enough cases of
// its own (see `Rectangle.Clone`).
const opt = { smart: true, pot: true, square: false, allowRotation: false, tag: true };

describe("clone", () => {
    const geometry = (rects) => rects.map((rect) => [rect.x, rect.y, rect.width, rect.height]);
    const placements = (target) => target.rects.map((rect) => [rect.x, rect.y, rect.width, rect.height, rect.rot]);

    // A rect whose x/y are own accessors over state only its own closure can see, with a clone() that builds
    // that state for the copy. Whether the copy keeps those accessors is the whole question: replacing them
    // with the source's puts the source's closure in charge of the copy.
    const closureRect = ({ freezeCopy = false } = {}) => {
        const make = (x = 0, y = 0) => {
            const state = { x, y };
            const rect = { width: 100, height: 100 };
            for (const axis of ["x", "y"]) {
                Object.defineProperty(rect, axis, {
                    get: () => state[axis],
                    set: (value) => {
                        state[axis] = value;
                    },
                    enumerable: true,
                    configurable: true
                });
            }
            rect.clone = () => {
                const copy = make(state.x, state.y);
                if (freezeCopy) {
                    for (const axis of ["x", "y"]) {
                        Object.defineProperty(copy, axis, {
                            ...Object.getOwnPropertyDescriptor(copy, axis),
                            configurable: false
                        });
                    }
                }
                return copy;
            };
            return rect;
        };
        return make();
    };

    test("copies the state and gives the copy its own rects", () => {
        const bin = new MaxRectsBin(256, 128, 0, { ...opt, allowRotation: true });
        bin.add(new Rectangle(100, 100));
        bin.add(new Rectangle(80, 120));

        const clone = bin.clone();
        expect(clone.width).toBe(bin.width);
        expect(clone.height).toBe(bin.height);
        expect(clone.options).toEqual(bin.options);
        expect(geometry(clone.freeRects)).toEqual(geometry(bin.freeRects));
        expect(clone.rects).toEqual(bin.rects);
        expect(clone.rects[0]).not.toBe(bin.rects[0]);
        expect(clone.freeRects[0]).not.toBe(bin.freeRects[0]);
    });

    test("keeps the two bins out of each other's state", () => {
        const bin = new MaxRectsBin(256, 128, 0, opt);
        bin.add(new Rectangle(100, 100));
        const clone = bin.clone();

        // Each bin only reaches the rects it holds itself.
        clone.rects[0].width = 999;
        expect(bin.rects[0].width).toBe(100);
        bin.rects[0].height = 777;
        expect(clone.rects[0].height).toBe(100);

        // Growing one bin leaves the other where it was.
        clone.add(new Rectangle(10, 10));
        expect(clone.rects).toHaveLength(2);
        expect(bin.rects).toHaveLength(1);
    });

    test("keeps the prototype and the extra properties of a custom rect", () => {
        class Atlas {
            constructor(width, height, name) {
                this.width = width;
                this.height = height;
                this.name = name;
            }
        }
        const bin = new MaxRectsBin(256, 128, 0, opt);
        const atlas = new Atlas(100, 100, "sheet");
        bin.add(atlas);

        const clone = bin.clone();
        expect(clone.rects[0]).not.toBe(atlas);
        expect(clone.rects[0]).toBeInstanceOf(Atlas);
        expect(clone.rects[0].name).toBe("sheet");
        expect(clone.rects[0].x).toBe(atlas.x);
        expect(clone.rects[0].y).toBe(atlas.y);
        // The copy is shallow: the payload object itself is shared.
        expect(clone.rects[0].data).toBe(atlas.data);
    });

    test("copies the tag and the data", () => {
        const bin = new MaxRectsBin(256, 128, 0, opt);
        bin.add(new Rectangle(100, 100));
        // The tag lands on an already-filled bin, so the copy has to carry a tagged bin whose rects are
        // untagged: the replay must not re-run the tag gate, or it would drop them.
        bin.tag = "one";
        bin.data = { name: "sheet" };

        const clone = bin.clone();
        expect(clone.tag).toBe("one");
        expect(clone.data).toBe(bin.data);
    });

    test("copies a tagged bin under exclusiveTag", () => {
        // The tag has to be on the copy before the rects are replayed, or `place()` refuses every tagged
        // rect and the copy comes back empty — which is what it did until now.
        const bin = new MaxRectsBin(1024, 1024, 0, { ...opt, exclusiveTag: true });
        bin.tag = "one";
        const rect = new Rectangle(100, 100);
        rect.data = { tag: "one" };
        expect(bin.add(rect)).toBeDefined();

        const clone = bin.clone();
        expect(clone.rects).toHaveLength(1);
        expect(clone.tag).toBe("one");
        expect(clone.rects[0]).not.toBe(rect);
    });

    test("uses the rect's own clone() when its class has one", () => {
        // A class holding its state behind `#private` fields cannot be copied property by property, so it
        // gets to say how — and the copy still ends up independent of the original.
        class PrivateRect {
            #width;
            #height;
            constructor(width, height) {
                this.#width = width;
                this.#height = height;
            }
            get width() {
                return this.#width;
            }
            set width(value) {
                this.#width = value;
            }
            get height() {
                return this.#height;
            }
            set height(value) {
                this.#height = value;
            }
            clone() {
                return new PrivateRect(this.#width, this.#height);
            }
        }
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = new PrivateRect(100, 100);
        bin.add(rect);

        const clone = bin.clone();
        expect(clone.rects[0]).toBeInstanceOf(PrivateRect);
        expect(clone.rects[0]).not.toBe(rect);
        expect(clone.rects[0].width).toBe(100);
        // Prototype methods come with the instance the `clone()` returns, so cloning the copy works without
        // the library handing any function over.
        expect(clone.rects[0].clone()).toBeInstanceOf(PrivateRect);

        clone.rects[0].width = 42;
        expect(rect.width).toBe(100);
    });

    test("reports a rect class it cannot copy", () => {
        class PrivateRect {
            #width;
            #height;
            constructor(width, height) {
                this.#width = width;
                this.#height = height;
            }
            get width() {
                return this.#width;
            }
            set width(value) {
                this.#width = value;
            }
            get height() {
                return this.#height;
            }
            set height(value) {
                this.#height = value;
            }
        }
        const bin = new MaxRectsBin(256, 256, 0, opt);
        bin.add(new PrivateRect(100, 100));

        // With no `clone()` to fall back on, the copy would throw on the first getter reading `#width`, so
        // the message says what to add. Sharing the rect instead is the aliasing this change removed.
        expect(() => bin.clone()).toThrow("give its class a clone() method");
    });

    test("reports a rect it can no longer place", () => {
        // A placed rect the caller resized out of the bin would make the copy incomplete; an error beats
        // a bin that quietly holds fewer rects than the original.
        const bin = new MaxRectsBin(256, 128, 0, opt);
        const rect = new Rectangle(100, 100);
        bin.add(rect);
        rect.width = 4000;

        expect(() => bin.clone()).toThrow("repack the bin before cloning it");
    });

    test("copies non-enumerable own properties", () => {
        // A rect is free to keep its extra fields — or the backing fields behind width/height — out of
        // enumeration. `Object.assign` would drop those, and a hidden `width` would then read as
        // `undefined` and be blamed on a rect that "can no longer be placed".
        class HiddenRect {
            constructor(width, height, label) {
                Object.defineProperty(this, "width", { value: width, enumerable: false, writable: true });
                Object.defineProperty(this, "height", { value: height, enumerable: false, writable: true });
                Object.defineProperty(this, "label", { value: label, enumerable: false, writable: true });
            }
        }
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = new HiddenRect(100, 100, "hidden");
        expect(bin.add(rect)).toBeDefined();

        const clone = bin.clone();
        expect(clone.rects).toHaveLength(1);
        expect(clone.rects[0]).not.toBe(rect);
        expect(clone.rects[0].label).toBe("hidden");
        expect(Object.getOwnPropertyDescriptor(clone.rects[0], "label").enumerable).toBe(false);
        expect([clone.rects[0].x, clone.rects[0].y]).toEqual([rect.x, rect.y]);
    });

    test("copies a rect with Object.getOwnPropertySymbols removed, the ES5 path", () => {
        // Symbols are ES2015 and the bundle promises no engine requirement beyond ES5, so the copy reads
        // them behind a feature check instead of calling for them. An ES5 engine takes the other branch:
        // the string-keyed descriptors still have to travel and the copy still has to be placeable.
        // The window has to stay free of `expect` — vitest's own equality checks call the API too — so
        // the values are captured inside it and asserted after it closes.
        const symbols = Object.getOwnPropertySymbols;
        let added;
        let clone;
        let source;
        delete Object.getOwnPropertySymbols;
        try {
            const bin = new MaxRectsBin(256, 256, 0, opt);
            source = new Rectangle(100, 100);
            source.extra = "kept";
            Object.defineProperty(source, "hidden", {
                value: 7,
                enumerable: false,
                writable: true,
                configurable: true
            });
            added = bin.add(source);
            clone = bin.clone();
        } finally {
            Object.getOwnPropertySymbols = symbols;
        }

        expect(added).toBeDefined();
        expect(clone.rects).toHaveLength(1);
        expect(clone.rects[0]).not.toBe(source);
        expect(clone.rects[0].extra).toBe("kept");
        expect(clone.rects[0].hidden).toBe(7);
        expect([clone.rects[0].x, clone.rects[0].y]).toEqual([source.x, source.y]);
    });

    test("reports a rect whose placement is out of reach", () => {
        // The size is a plain field here and only `x`/`y` sit behind `#private`, so a size-only check
        // would wave this copy through and then die on the setter the replay uses.
        class PrivatePlacementRect {
            #x = 0;
            #y = 0;
            constructor(width, height) {
                this.width = width;
                this.height = height;
            }
            get x() {
                return this.#x;
            }
            set x(value) {
                this.#x = value;
            }
            get y() {
                return this.#y;
            }
            set y(value) {
                this.#y = value;
            }
        }
        const bin = new MaxRectsBin(256, 256, 0, opt);
        bin.add(new PrivatePlacementRect(100, 100));

        expect(() => bin.clone()).toThrow("give its class a clone() method");
    });

    test("keeps what a narrow custom clone() leaves out", () => {
        // A class whose clone() rebuilds only the dimensions is the tempting implementation; the copy
        // still has to carry the payload, the placement and the extra fields the bin holds it with.
        class MinimalRect {
            constructor(width, height) {
                this.width = width;
                this.height = height;
            }
            clone() {
                const copy = new MinimalRect(this.width, this.height);
                copy.cloneWasCalled = true;
                return copy;
            }
        }
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = new MinimalRect(100, 100);
        // A payload without a `tag`: `opt` tags exclusively, and an untagged bin refuses a tagged rect.
        rect.data = { sheet: "atlas-1" };
        rect.extra = "custom metadata";
        expect(bin.add(rect)).toBeDefined();

        const copy = bin.clone().rects[0];
        expect(copy.cloneWasCalled).toBe(true); // the class's own clone() is still what builds the base
        expect(copy).not.toBe(rect);
        expect(copy.data).toBe(rect.data);
        expect(copy.extra).toBe("custom metadata");
        expect([copy.x, copy.y, copy.rot]).toEqual([rect.x, rect.y, rect.rot]);
    });

    test("keeps plain coordinates a custom clone() returned instead of the source's accessors", () => {
        // The source holds `x`/`y` in own accessors over its closure, and its `clone()` hands out plain
        // coordinates. Adopting those accessors would put the source's closure behind the copy's
        // coordinates, so moving the copy would move the original.
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = closureRect();
        rect.clone = () => ({ width: 100, height: 100, x: 0, y: 0 });
        bin.add(rect);
        const sourcePlacement = [rect.x, rect.y];

        const copy = bin.clone().rects[0];
        expect(Object.getOwnPropertyDescriptor(copy, "x").get).toBeUndefined();
        copy.x = 999;
        copy.y = 999;
        expect([rect.x, rect.y]).toEqual(sourcePlacement);
    });

    test("keeps the clone function a custom clone() gave the copy", () => {
        // `clone` is behaviour bound to the object it closes over. Taking the source's function would make
        // a second clone of the copy read the original's state instead of the copy's.
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = closureRect();
        bin.add(rect);

        const copy = bin.clone().rects[0];
        copy.x = 50;
        expect(copy.clone().x).toBe(50);
        expect(rect.x).toBe(0);
    });

    test("restores the state a subclass clone() left at its constructor defaults", () => {
        // A `Rectangle` subclass that rebuilds only the dimensions starts from the constructor's `_data` and
        // `_allowRotation` defaults. Those are plain own data properties, so they are bin state rather than
        // the class's decision about the copy: the payload and the per-item rotation permission have to come
        // from the source. Accessors and non-configurable properties of the copy are still left alone.
        class SheetRect extends Rectangle {
            clone() {
                return new SheetRect(this.width, this.height);
            }
        }
        const bin = new MaxRectsBin(256, 256, 0, { ...opt, allowRotation: true });
        const rect = new SheetRect(200, 100);
        rect.data = { sheet: "atlas-1" };
        rect.allowRotation = true;
        bin.add(rect);

        const copy = bin.clone().rects[0];
        expect(copy).not.toBe(rect);
        expect(copy).toEqual(rect); // every own property, the constructor defaults included
        expect(copy.data).toEqual({ sheet: "atlas-1" });
        expect(copy.allowRotation).toBe(true);
    });

    test("keeps the placement accessors a custom clone() built for the copy", () => {
        // Filling the copy's gaps from the source must not reach into what the copy already defines: the
        // source's accessor closes over the *source's* state, so putting it back on the copy would make
        // writing to the clone write to the original — the aliasing this whole change removes.
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = closureRect();
        bin.add(rect);
        const sourcePlacement = [rect.x, rect.y];

        const clone = bin.clone();
        const copy = clone.rects[0];
        expect(Object.getOwnPropertyDescriptor(copy, "x").set).not.toBe(Object.getOwnPropertyDescriptor(rect, "x").set);

        copy.x = 999;
        copy.y = 999;
        expect([rect.x, rect.y]).toEqual(sourcePlacement);

        clone.repack();
        expect([rect.x, rect.y]).toEqual(sourcePlacement);
        expect(clone.rects[0]).toBe(copy);
    });

    test("leaves a non-configurable property of a custom clone() alone", () => {
        // The copy declares its own x/y as non-configurable, so merging the source's descriptors over them
        // would throw (`Cannot redefine property: x`) instead of copying anything.
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = closureRect({ freezeCopy: true });
        bin.add(rect);

        const clone = bin.clone();
        expect(clone.rects).toHaveLength(1);
        expect(clone.rects[0]).not.toBe(rect);

        clone.rects[0].y = 777;
        expect(rect.y).toBe(0);
        expect(clone.rects[0].y).toBe(777);
    });

    test("keeps a non-configurable data property the copy declares", () => {
        // It cannot be redefined, so the copy's own value stands rather than the merge throwing. Both sides
        // freeze it, which is what makes the outcome visible.
        const makeRect = (label) => {
            const rect = { width: 100, height: 100 };
            Object.defineProperty(rect, "label", { value: label, enumerable: true, configurable: false });
            rect.clone = () => makeRect("copy");
            return rect;
        };
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = makeRect("source");
        bin.add(rect);

        const copy = bin.clone().rects[0];
        expect(copy.label).toBe("copy");
        expect(rect.label).toBe("source");
    });

    test("does not adopt an accessor the copy left out", () => {
        // An accessor of the source that the copy does not define is not filled in: it would bring the
        // source's closure with it. Coordinates do not need it — the replay writes the placement.
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = closureRect();
        rect.clone = () => ({ width: 100, height: 100 });
        bin.add(rect);
        const sourcePlacement = [rect.x, rect.y];

        const copy = bin.clone().rects[0];
        expect(Object.getOwnPropertyDescriptor(copy, "x").get).toBeUndefined(); // plain data, not the source's getter
        expect([copy.x, copy.y]).toEqual(sourcePlacement);
        expect(rect.x).toBe(sourcePlacement[0]);
    });

    test("keeps the state-backed accessors a custom clone() built on the copy", () => {
        // The inverse of the source-accessor case: the source holds plain `x`/`y`, while its `clone()`
        // gives the copy accessors over the copy's own closure. Replacing those with the source's plain
        // values would leave the copy's coordinates detached from the state its own `clone()` reads.
        const makeCopy = (x, y) => {
            const state = { x, y };
            const copy = { width: 100, height: 100 };
            for (const axis of ["x", "y"]) {
                Object.defineProperty(copy, axis, {
                    get: () => state[axis],
                    set: (value) => {
                        state[axis] = value;
                    },
                    enumerable: true,
                    configurable: true
                });
            }
            copy.clone = () => makeCopy(state.x, state.y);
            return copy;
        };
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = { width: 100, height: 100, x: 0, y: 0 };
        rect.clone = () => makeCopy(rect.x, rect.y);
        bin.add(rect);

        const copy = bin.clone().rects[0];
        expect(typeof Object.getOwnPropertyDescriptor(copy, "x").get).toBe("function");
        copy.x = 40;
        expect(copy.clone().x).toBe(40); // the copy's own clone() reads the copy's state
        expect(rect.x).toBe(0);
    });

    test("leaves an own method the copy was not given out of the copy", () => {
        // State travels, behaviour does not: no function is taken from the source, so a `clone()` that
        // rebuilds only the dimensions has to define the methods its result needs. The source keeps its
        // own method, and a caller of `bin.clone().rects[0].describe()` gets a `TypeError` rather than a
        // method that could reach back into the original.
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = { width: 100, height: 50 };
        rect.describe = function () {
            return `${this.width}x${this.height}`;
        };
        rect.clone = () => ({ width: rect.width, height: rect.height });
        bin.add(rect);

        const copy = bin.clone().rects[0];
        expect(copy.describe).toBeUndefined();
        expect(rect.describe()).toBe("100x50");
    });

    test("leaves a concise method the copy was not given out of the copy", () => {
        // The same rule, and the shape that made every source-text check fail in one direction or the
        // other: a concise method has no `prototype` either, so it cannot be told from an arrow from the
        // outside. Nothing is classified any more, so both stay behind.
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = { width: 100, height: 50 };
        rect.describe = {
            describe() {
                return `${this.width}x${this.height}`;
            }
        }.describe;
        rect.clone = () => ({ width: rect.width, height: rect.height });
        bin.add(rect);

        const copy = bin.clone().rects[0];
        expect(copy.describe).toBeUndefined();
        expect(rect.describe()).toBe("100x50");
    });

    test("keeps arrow and bound methods out of the copy", () => {
        // A function created in the source's scope reads that scope wherever it is called, so a method call
        // on a rect in the cloned bin would change the original. All three shapes stay behind, the nested
        // call in a default parameter included — that one is what a source-text check missed.
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = { width: 100, height: 50 };
        rect.scale = () => {
            rect.width *= 2;
        };
        rect.reset = function () {
            rect.width = 100;
        }.bind(rect);
        rect.grow = (next = Math.max(50, rect.width + 100)) => {
            rect.width = next;
            return next;
        };
        rect.clone = () => ({ width: rect.width, height: rect.height });
        bin.add(rect);

        const copy = bin.clone().rects[0];
        expect(copy.scale).toBeUndefined();
        expect(copy.reset).toBeUndefined();
        expect(copy.grow).toBeUndefined();
        expect(rect.width).toBe(100);
    });

    test("keeps the methods a clone() gave the copy, whatever their text", () => {
        // Behaviour comes from the `clone()` now, so the text of a function decides nothing: a method the
        // copy carries survives even when its body spells `[native code]`, and a mutator among them writes
        // the copy's own state.
        const makeCopy = (width) => {
            const copy = { width, height: 50 };
            copy.describe = function () {
                return `${this.width} [native code]`;
            };
            copy.grow = function () {
                this.width *= 2;
            };
            copy.clone = () => makeCopy(copy.width);
            return copy;
        };
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = { width: 100, height: 50 };
        rect.omit = function () {
            return `[native code] ${this.width}`;
        };
        rect.clone = () => makeCopy(rect.width);
        bin.add(rect);

        const copy = bin.clone().rects[0];
        expect(copy.describe()).toBe("100 [native code]");
        copy.grow();
        expect(copy.describe()).toBe("200 [native code]");
        expect(copy.omit).toBeUndefined(); // text decides nothing, in either direction
        expect(rect.width).toBe(100);
    });

    test("clones a copy again without reaching the original", () => {
        // The copy carries the `clone()` its own class built, so cloning the clone stays on the copy's
        // state; the original is untouched at every step.
        const makeCopy = (from) => {
            const copy = { width: from.width, height: from.height };
            copy.clone = () => makeCopy(copy);
            return copy;
        };
        const bin = new MaxRectsBin(256, 256, 0, opt);
        const rect = { width: 100, height: 50 };
        rect.clone = () => makeCopy(rect);
        bin.add(rect);

        const first = bin.clone();
        first.rects[0].width = 42;
        const second = first.clone();
        expect(second.rects[0].width).toBe(42);
        expect(second.rects[0]).not.toBe(first.rects[0]);
        expect(rect.width).toBe(100);
    });

    test("reproduces the placements of a bin with rotated rects", () => {
        // The copy is re-packed rather than memcpy'd, so this is the check that the replay lands where
        // the source did — rotation included.
        const bin = new MaxRectsBin(256, 256, 0, { ...opt, allowRotation: true });
        bin.add(new Rectangle(200, 100));
        bin.add(new Rectangle(100, 200));
        expect(bin.rects[1].rot).toBe(true); // the fixture has to rotate a rect, or this proves nothing

        expect(placements(bin.clone())).toEqual(placements(bin));
    });

    test("reproduces the source placements over seeded bins", () => {
        // The single fixture above samples the property; this sweeps it. A copy strategy that changed
        // the replayed input — a rect's dimensions swapped by rotation, say — would show up here as a
        // different placement, while a shrunken user count would hide it in one fixture.
        let seed = 42;
        const random = () => {
            seed = (seed * 1103515245 + 12345) % 2147483648;
            return seed / 2147483648;
        };
        for (const allowRotation of [false, true]) {
            for (let round = 0; round < 40; round++) {
                const bin = new MaxRectsBin(1024, 1024, 1, { ...opt, allowRotation });
                for (let i = 0; i < 30; i++) {
                    bin.add(new Rectangle(50 + Math.floor(random() * 900), 50 + Math.floor(random() * 900)));
                }
                expect(placements(bin.clone()), `allowRotation=${allowRotation} round=${round}`).toEqual(
                    placements(bin)
                );
            }
        }
    });
});
