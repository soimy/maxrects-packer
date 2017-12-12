export interface IRectangle {
    x:number,
    y:number,
    width:number,
    height:number
}

export class Rectangle {
    public data:any;
    constructor(public x:number = 0, public y:number = 0, public width:number = 0, public height:number = 0) {
        this.data = {};
    }

    public area():number { return this.width * this.height; }

    public collide(rect:Rectangle):boolean {
        return (rect.x >= this.x + this.width || rect.x + rect.width <= this.x ||
                rect.y >= this.y + this.height || rect.y + rect.height <= this.y);
    }

    public static Collide(rect1:Rectangle, rect2:Rectangle) { return rect1.collide(rect2); }
}
