"use strict"

const Rectangle = require("../dist/maxrects-packer").Rectangle;

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

    test("Dynamiclly changing value", () => {
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
        rect.data = {foo: "bar"};
        expect(rect.dirty).toBe(true);
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