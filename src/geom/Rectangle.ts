export interface IRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    [propName: string]: any;
}

export class Rectangle implements IRectangle {
    public data: any;
    constructor (public x: number = 0, public y: number = 0, public width: number = 0, public height: number = 0) {
        this.data = {};
    }
    public static Collide (first: Rectangle, second: Rectangle) { return first.collide(second); }
    public static Contain (first: Rectangle, second: Rectangle) { return first.contain(second); }

    public area (): number { return this.width * this.height; }

    public collide (rect: Rectangle): boolean {
        return !(rect.x >= this.x + this.width || rect.x + rect.width <= this.x ||
                rect.y >= this.y + this.height || rect.y + rect.height <= this.y);
    }

    public contain (rect: Rectangle): boolean {
        return (rect.x >= this.x && rect.y >= this.y &&
                rect.x + rect.width <= this.x + this.width && rect.y + rect.height <= this.y + this.height);
    }

}
