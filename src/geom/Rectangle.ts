export interface IRectangle {
    width: number;
    height: number;
    x: number;
    y: number;
    [propName: string]: any;
}

export class Rectangle implements IRectangle {
    public data: any;
    public oversized: boolean = false;
    constructor (
        public width: number = 0,
        public height: number = 0,
        public x: number = 0,
        public y: number = 0,
        public rot: boolean = false) {
        this.data = {};
    }
    public static Collide (first: Rectangle, second: Rectangle) { return first.collide(second); }
    public static Contain (first: Rectangle, second: Rectangle) { return first.contain(second); }

    public area (): number { return this.width * this.height; }

    public collide (rect: Rectangle): boolean {
        return (
            rect.x < this.x + this.width &&
            rect.x + rect.width > this.x &&
            rect.y < this.y + this.height &&
            rect.y + rect.height > this.y
        );
    }

    public contain (rect: Rectangle): boolean {
        return (rect.x >= this.x && rect.y >= this.y &&
                rect.x + rect.width <= this.x + this.width && rect.y + rect.height <= this.y + this.height);
    }

}
