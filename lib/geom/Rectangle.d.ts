export interface IRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    [propName: string]: any;
}
export declare class Rectangle implements IRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    rot: boolean;
    data: any;
    constructor(x?: number, y?: number, width?: number, height?: number, rot?: boolean);
    static Collide(first: Rectangle, second: Rectangle): boolean;
    static Contain(first: Rectangle, second: Rectangle): boolean;
    area(): number;
    collide(rect: Rectangle): boolean;
    contain(rect: Rectangle): boolean;
}
