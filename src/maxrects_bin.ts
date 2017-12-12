import { EDGE_MAX_VALUE, Option } from "./maxrects_packer";
import { Rectangle, IRectangle } from "./geom/Rectangle";

export class MaxRectsBin {
    public freeRects:Rectangle[];
    public rects:Rectangle[];
    public static verticalExpand:boolean = false;

    constructor(
        private maxWidth:number = EDGE_MAX_VALUE, 
        private maxHeight:number = EDGE_MAX_VALUE, 
        private padding:number = 0, 
        private options:Option = {smart: true, pot: true, square: true}) 
    {
        this.freeRects.push(new Rectangle(0, 0, this.maxWidth + this.padding, this.maxHeight + this.padding));
    }

    public add(width:number, height:number, data:any) {

    }

    private findNode(width:number, height:number):Rectangle {
        let score:number = Number.MAX_VALUE;
        let areaFit:number, r:Rectangle, bestNode:Rectangle = new Rectangle();
        for (let i in this.freeRects) {
            r = this.freeRects[i];
            if (r.width >= width && r.height >= height) {
                areaFit = r.width * r.height - width * height;
                if (areaFit < score) {
                    bestNode.x = r.x;
                    bestNode.y = r.y;
                    bestNode.width = width;
                    bestNode.height = height;  
                    score = areaFit;
                }
            }
        }
        return bestNode;
    }

    private splitNode(freeRect:Rectangle, usedNode:Rectangle):boolean {
        // Test if usedNode intersect with freeRect

    }
}