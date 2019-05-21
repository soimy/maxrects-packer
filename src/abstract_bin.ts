import { IRectangle, Rectangle } from "./geom/Rectangle";
import { IOption } from "./maxrects_packer";

export interface IBin {
    width: number;
    height: number;
    maxWidth: number;
    maxHeight: number;
    freeRects: IRectangle[];
    rects: IRectangle[];
    options: IOption;
}

export abstract class Bin<T extends IRectangle = Rectangle> implements IBin {
    public width!: number;
    public height!: number;
    public maxWidth!: number;
    public maxHeight!: number;
    public freeRects!: IRectangle[];
    public rects!: T[];
    public options!: IOption;
    public abstract add (rect: T): T | undefined;
    public abstract add (width: number, height: number, data: any): IRectangle | undefined;
}
