import { describe, expect, test } from "vitest";
import { Rectangle } from "../src/geom/Rectangle";
import { MaxRectsPacker } from "../src/maxrects-packer";

const bigRect = new Rectangle(512, 512, 0, 0);
const containedRect = new Rectangle(256, 256, 16, 128);
const collideRect = new Rectangle(256, 256, 384, 128);

describe("Rectangle", () => {
    test("Default value", () => {
        const rect = new Rectangle();
        expect(rect.width).toBe(0);
        expect(rect.height).toBe(0);
        expect(rect.x).toBe(0);
        expect(rect.y).toBe(0);
        expect(rect.dirty).toBe(false);
    });

    test("Specified value", () => {
        const rect = new Rectangle(512, 512, 16);
        expect(rect.width).toBe(512);
        expect(rect.height).toBe(512);
        expect(rect.x).toBe(16);
        expect(rect.y).toBe(0);
        expect(rect.dirty).toBe(false);
    });

    test("Dynamically changing value", () => {
        const rect = new Rectangle(512, 512, 16);
        rect.width = 256;
        rect.y = 32;
        expect(rect.width).toBe(256);
        expect(rect.y).toBe(32);
        expect(rect.dirty).toBe(true);
    });

    test("Report dirty status correctly", () => {
        const rect = new Rectangle(512, 512, 16);
        rect.width = 256;
        expect(rect.dirty).toBe(true);
        rect.setDirty(false);
        expect(rect.dirty).toBe(false);
        rect.y = 32;
        expect(rect.dirty).toBe(true);
        rect.setDirty(false);
        rect.data = { foo: "bar" };
        expect(rect.dirty).toBe(true);
    });

    test("setDirty() defaults to marking the rect dirty", () => {
        const rect = new Rectangle(512, 512);
        rect.setDirty(false);
        expect(rect.dirty).toBe(false);

        rect.setDirty();
        expect(rect.dirty).toBe(true);

        rect.setDirty(false);
        expect(rect.dirty).toBe(false);
    });

    test("Rot flag functionality", () => {
        const rect = new Rectangle(512, 256);
        expect(rect.rot).toBe(false);
        rect.rot = true;
        expect(rect.rot).toBe(true);
        expect(rect.width).toBe(256);
        expect(rect.height).toBe(512);
        expect(rect.dirty).toBe(true);
        rect.setDirty(false);
        rect.rot = true;
        expect(rect.width).toBe(256);
        expect(rect.height).toBe(512);
        expect(rect.dirty).toBe(false);
        rect.rot = false;
        expect(rect.rot).toBe(false);
        expect(rect.width).toBe(512);
        expect(rect.height).toBe(256);
        expect(rect.dirty).toBe(true);
    });

    test("allowRotation setting", () => {
        const rect = new Rectangle(512, 256, 0, 0, false, true);
        expect(rect.allowRotation).toBe(true);
        rect.allowRotation = false;
        expect(rect.allowRotation).toBe(false);
    });

    test("allowRotation setter ignores an unchanged value", () => {
        const rect = new Rectangle(512, 256);
        rect.allowRotation = true;
        rect.setDirty(false);

        rect.allowRotation = true; // unchanged: must not bump the dirty counter
        expect(rect.dirty).toBe(false);

        rect.allowRotation = false;
        expect(rect.dirty).toBe(true);
    });

    test("data.allowRotation sync", () => {
        const rect = new Rectangle(512, 256);
        expect(rect.allowRotation).toBeUndefined();
        rect.data = { allowRotation: false };
        expect(rect.allowRotation).toBe(false);
        rect.data = { allowRotation: true };
        expect(rect.allowRotation).toBe(true);
    });

    test("method: area()", () => {
        const rect = new Rectangle(16, 16);
        expect(rect.area()).toBe(256);
    });

    test("method: collide()", () => {
        expect(bigRect.collide(collideRect)).toBe(true);
        expect(bigRect.collide(containedRect)).toBe(true);
        expect(containedRect.collide(collideRect)).toBe(false);
        expect(Rectangle.Collide(bigRect, collideRect)).toBe(true);
    });

    test("method: contain()", () => {
        expect(bigRect.contain(collideRect)).toBe(false);
        expect(bigRect.contain(containedRect)).toBe(true);
        expect(containedRect.contain(collideRect)).toBe(false);
        expect(Rectangle.Contain(bigRect, containedRect)).toBe(true);
        expect(Rectangle.Contain(bigRect, collideRect)).toBe(false);
    });
});

describe("Rectangle.toJSON()", () => {
    test("Serializes the public shape, not the backing fields", () => {
        // The regression: without toJSON() this was
        // {"oversized":false,"_rot":false,"_dirty":0,"_width":10,"_height":20,"_x":0,"_y":0,"_data":{}}
        expect(JSON.stringify(new Rectangle(10, 20))).toBe('{"width":10,"height":20,"x":0,"y":0,"rot":false}');
    });

    test("Never leaks the dirty counter", () => {
        const rect = new Rectangle(10, 20);
        rect.width = 11; // bumps the internal counter
        expect(JSON.stringify(rect)).not.toContain("_dirty");
        expect(Object.keys(JSON.parse(JSON.stringify(rect)))).toEqual(["width", "height", "x", "y", "rot"]);
    });

    test("Carries a non-empty data payload", () => {
        const rect = new Rectangle(10, 20);
        rect.data = { id: 7 };
        expect(JSON.parse(JSON.stringify(rect)).data).toEqual({ id: 7 });
    });

    test("Omits the default empty payload", () => {
        expect(JSON.stringify(new Rectangle(10, 20))).not.toContain("data");
    });

    test("Keeps a payload the caller explicitly set to an empty object", () => {
        // The constructor's `{}` and a caller's `{}` are different things, and the plain object the
        // packer also accepts keeps the field, so a Rectangle has to as well.
        const rect = new Rectangle(10, 20);
        rect.data = {};
        expect(JSON.parse(JSON.stringify(rect))).toHaveProperty("data");
        expect(JSON.parse(JSON.stringify(rect)).data).toEqual({});
    });

    test("Keeps an explicit null-prototype payload", () => {
        const rect = new Rectangle(10, 20);
        rect.data = Object.create(null);
        expect(JSON.parse(JSON.stringify(rect))).toHaveProperty("data");
    });

    test("Keeps a custom field whose name starts with an underscore", () => {
        // Only the class's own backing fields are internal; the underscore is a naming convention the
        // caller may use too, and the contract keeps every other own field.
        const rect = new Rectangle(10, 20);
        rect._assetId = "sprite";
        expect(JSON.parse(JSON.stringify(rect))._assetId).toBe("sprite");
    });

    test("Keeps a field named after an Object.prototype member", () => {
        // `BACKING_FIELDS[key]` reads the prototype chain, so a plain lookup treated `toString` and
        // friends as backing fields and dropped them.
        const names = ["constructor", "toString", "valueOf", "hasOwnProperty", "isPrototypeOf"];
        for (const name of names) {
            const rect = new Rectangle(10, 20);
            rect[name] = "sprite";
            expect(JSON.parse(JSON.stringify(rect))[name]).toBe("sprite");
        }
    });

    test("Keeps an own __proto__ data field", () => {
        // The one name `json[key] = value` cannot record: it reaches the inherited accessor and repoints
        // the result's prototype instead of adding the field.
        const rect = new Rectangle(10, 20);
        Object.defineProperty(rect, "__proto__", {
            value: "sprite",
            enumerable: true,
            configurable: true,
            writable: true
        });
        const json = JSON.parse(JSON.stringify(rect));
        expect(Object.prototype.hasOwnProperty.call(json, "__proto__")).toBe(true);
        expect(Object.getOwnPropertyDescriptor(json, "__proto__").value).toBe("sprite");
    });

    test("Leaves out a custom field the caller made non-enumerable", () => {
        // `JSON.stringify()` reads enumerable own string properties only, so a hidden field has to stay out
        // of the public shape or the rect would expose more than the same data on a plain object.
        const rect = new Rectangle(10, 20);
        Object.defineProperty(rect, "secret", { value: "hidden", enumerable: false });
        expect(JSON.parse(JSON.stringify(rect))).not.toHaveProperty("secret");
    });

    test("Does not read a custom getter the caller made non-enumerable", () => {
        // The sharper half of the same rule: reading a hidden getter runs code that the caller's own
        // serialization would never run.
        const rect = new Rectangle(10, 20);
        let reads = 0;
        Object.defineProperty(rect, "hidden", {
            get() {
                reads++;
                throw new Error("a hidden getter is not part of the public shape");
            },
            enumerable: false
        });
        expect(() => rect.toJSON()).not.toThrow();
        expect(reads).toBe(0);
    });

    test("Keeps a custom getter the caller left enumerable", () => {
        // The other side of the boundary: an enumerable accessor is read by `JSON.stringify()` too.
        const rect = new Rectangle(10, 20);
        Object.defineProperty(rect, "label", {
            get() {
                return "visible";
            },
            enumerable: true
        });
        expect(JSON.parse(JSON.stringify(rect)).label).toBe("visible");
    });

    test("Keeps a placeholder that was given a hidden own key", () => {
        // The payload test asks whether the placeholder was touched at all, so it counts every own key,
        // while the field loop copies the enumerable ones — two different questions about the same words.
        const rect = new Rectangle(10, 20);
        Object.defineProperty(rect.data, "hidden", { value: 1, enumerable: false });
        expect(JSON.parse(JSON.stringify(rect))).toHaveProperty("data");
    });

    test("Keeps a placeholder whose prototype the caller replaced", () => {
        // No own keys were added and neither earlier test changed, but the payload now serializes through
        // the prototype it was given, so it is the caller's value rather than the constructor's.
        const rect = new Rectangle(10, 20);
        Object.setPrototypeOf(rect.data, {
            toJSON() {
                return "custom";
            }
        });
        expect(JSON.parse(JSON.stringify(rect)).data).toBe("custom");
    });

    test("Keeps a placeholder whose prototype was set to null", () => {
        const rect = new Rectangle(10, 20);
        Object.setPrototypeOf(rect.data, null);
        expect(JSON.parse(JSON.stringify(rect))).toHaveProperty("data");
    });

    test("Keeps a fresh payload object a subclass assigned to the backing field", () => {
        // A new `{}` is the subclass's value even though it is shape-identical to the placeholder, so the
        // constructor's own object has to be recognised by identity rather than by how it looks.
        class EmptyDataRect extends Rectangle {
            constructor(...args) {
                super(...args);
                this._data = {};
            }
        }
        expect(JSON.parse(JSON.stringify(new EmptyDataRect(10, 20)))).toHaveProperty("data");
    });

    test("Keeps a payload a subclass assigned to the backing field as null", () => {
        // The setter is the documented path, but the field is reachable from a subclass, and a `null`
        // there is a payload. Counting keys on it throws rather than answering.
        class NullDataRect extends Rectangle {
            constructor(...args) {
                super(...args);
                this._data = null;
            }
        }
        expect(JSON.parse(JSON.stringify(new NullDataRect(10, 20))).data).toBeNull();
    });

    test("Keeps a payload a subclass assigned to the backing field as a primitive", () => {
        class PrimitiveDataRect extends Rectangle {
            constructor(...args) {
                super(...args);
                this._data = "payload";
            }
        }
        expect(JSON.parse(JSON.stringify(new PrimitiveDataRect(10, 20))).data).toBe("payload");
    });

    test("Keeps a subclass getter that returns its own empty object", () => {
        // The backing field is still the base placeholder, but the getter is what the caller reads, so the
        // value is the caller's.
        class EmptyPayloadRect extends Rectangle {
            get data() {
                return {};
            }
        }
        expect(JSON.parse(JSON.stringify(new EmptyPayloadRect(10, 20)))).toHaveProperty("data");
    });

    test("Keeps a subclass's underscore-prefixed field", () => {
        class MetaRect extends Rectangle {
            constructor(...args) {
                super(...args);
                this._meta = { v: 1 };
            }
        }
        expect(JSON.parse(JSON.stringify(new MetaRect(10, 20)))._meta).toEqual({ v: 1 });
    });

    test("Keeps an explicit null payload, which is not the default", () => {
        const rect = new Rectangle(10, 20);
        rect.data = null;
        expect(JSON.parse(JSON.stringify(rect)).data).toBeNull();
    });

    test("Carries oversized only when it is set", () => {
        const plain = new Rectangle(10, 20);
        expect(JSON.stringify(plain)).not.toContain("oversized");
        const oversized = new Rectangle(10, 20);
        oversized.oversized = true;
        expect(JSON.parse(JSON.stringify(oversized)).oversized).toBe(true);
    });

    test("Reports the stored orientation of a rotated rect", () => {
        const rect = new Rectangle(10, 20);
        rect.rot = true; // swaps width and height
        expect(JSON.stringify(rect)).toBe('{"width":20,"height":10,"x":0,"y":0,"rot":true}');
    });

    test("Keeps a subclass's own fields", () => {
        class SheetRect extends Rectangle {
            constructor(...args) {
                super(...args);
                this.label = "sheet";
            }
        }
        expect(JSON.parse(JSON.stringify(new SheetRect(4, 4))).label).toBe("sheet");
    });

    test("Keeps a field assigned after construction", () => {
        const rect = new Rectangle(4, 4);
        rect.assetId = "sprite";
        expect(JSON.parse(JSON.stringify(rect)).assetId).toBe("sprite");
    });

    test("Carries an explicit allowRotation override", () => {
        const rect = new Rectangle(10, 20);
        rect.allowRotation = false;
        expect(JSON.parse(JSON.stringify(rect)).allowRotation).toBe(false);
    });

    test("Omits allowRotation when no override is set", () => {
        expect(JSON.stringify(new Rectangle(10, 20))).not.toContain("allowRotation");
    });

    test("Carries a payload that only has prototype state", () => {
        // A Date has no own properties at all, so an "own keys are empty" test mistakes it for the
        // constructor's `{}` placeholder and drops the caller's payload.
        const rect = new Rectangle(10, 20);
        rect.data = new Date("2026-01-01T00:00:00Z");
        expect(JSON.parse(JSON.stringify(rect)).data).toBe("2026-01-01T00:00:00.000Z");
    });

    test("Carries a payload that serializes itself", () => {
        const rect = new Rectangle(10, 20);
        rect.data = { toJSON: () => "custom" };
        expect(JSON.parse(JSON.stringify(rect)).data).toBe("custom");
    });

    test("Carries a class-instance payload with no own fields", () => {
        class Payload {}
        const rect = new Rectangle(10, 20);
        rect.data = new Payload();
        expect(JSON.parse(JSON.stringify(rect))).toHaveProperty("data");
    });

    test("Reads a subclass's data getter rather than the backing field", () => {
        class PayloadRect extends Rectangle {
            get data() {
                return { fromSubclass: true };
            }
        }
        expect(JSON.parse(JSON.stringify(new PayloadRect(10, 20))).data).toEqual({ fromSubclass: true });
    });

    test("Reads a subclass's data getter that returns a non-plain object", () => {
        // The backing field is still the constructor's `{}`, so the payload test is the only thing that
        // can see this value; a prototype other than `Object.prototype` is a caller payload.
        class DateRect extends Rectangle {
            get data() {
                return new Date("2026-01-01T00:00:00Z");
            }
        }
        expect(JSON.parse(JSON.stringify(new DateRect(10, 20))).data).toBe("2026-01-01T00:00:00.000Z");
    });

    test("Reads a subclass's data getter that returns a primitive", () => {
        class PrimitiveRect extends Rectangle {
            get data() {
                return 0;
            }
        }
        // `0` is a value the caller chose, not the absence of one.
        expect(JSON.parse(JSON.stringify(new PrimitiveRect(10, 20))).data).toBe(0);
    });

    test("Keeps a placeholder the caller filled in place", () => {
        // No setter call, so the field is still the constructor's object — but it is no longer empty, and
        // its contents are the caller's.
        const rect = new Rectangle(10, 20);
        rect.data.id = 7;
        expect(JSON.parse(JSON.stringify(rect)).data).toEqual({ id: 7 });
    });

    test("Reads a subclass's allowRotation getter rather than the backing field", () => {
        class PinnedRect extends Rectangle {
            get allowRotation() {
                return true;
            }
        }
        expect(JSON.parse(JSON.stringify(new PinnedRect(10, 20))).allowRotation).toBe(true);
    });

    test("Matches the plain object the packer accepts for the same rect", () => {
        const packer = new MaxRectsPacker(64, 64);
        packer.addArray([{ width: 8, height: 8 }]);
        const plain = JSON.stringify(packer.rects[0]);

        const other = new MaxRectsPacker(64, 64);
        other.add(new Rectangle(8, 8));
        expect(JSON.stringify(other.rects[0])).toBe(plain);
    });

    test("Round-trips through the packer's own input contract", () => {
        const source = new MaxRectsPacker(64, 64);
        source.add(new Rectangle(8, 8));
        const revived = JSON.parse(JSON.stringify(source.rects[0]));

        const next = new MaxRectsPacker(64, 64);
        next.addArray([revived]);
        expect(next.rects[0].x).toBe(0);
        expect(next.rects[0].y).toBe(0);
    });
});
