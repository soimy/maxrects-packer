export interface IRectangle {
    width: number;
    height: number;
    x: number;
    y: number;
    [propName: string]: any;
}
export declare class Rectangle implements IRectangle {
    width: number;
    height: number;
    x: number;
    y: number;
    rot: boolean;
    data: any;
    oversized: boolean;
    constructor(width?: number, height?: number, x?: number, y?: number, rot?: boolean);
    static Collide(first: Rectangle, second: Rectangle): boolean;
    static Contain(first: Rectangle, second: Rectangle): boolean;
    area(): number;
    collide(rect: Rectangle): boolean;
    contain(rect: Rectangle): boolean;
}
