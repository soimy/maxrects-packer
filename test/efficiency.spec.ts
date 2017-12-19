import { expect } from 'chai';
import { MaxRectsPacker } from '../src/maxrects_packer';
let AsciiTable = require("ascii-table");

const SCENARIOS = require("./scenarios.json");

describe("Efficiency", () => {
    let rectSizeSum: any;
    before(() => {
        rectSizeSum = SCENARIOS.map(scenario => {
            return scenario.reduce((memo, rect) => memo + rect.width * rect.height, 0);
        });
    });

    it("test", () => {
        const CANDIDATES = [
            { name: "1024x2048:0", factory: () => new MaxRectsPacker(1024, 2048, 0) },
            { name: "1024x2048:1", factory: () => new MaxRectsPacker(1024, 2048, 1) },
            { name: "1024x1024:0", factory: () => new MaxRectsPacker(1024, 1024, 0) },
            { name: "1024x1024:1", factory: () => new MaxRectsPacker(1024, 1024, 1) },
            { name: "2048x2048:1", factory: () => new MaxRectsPacker(2048, 2048, 1) }
        ];

        let heading: string[] = ["#", "size"].concat(CANDIDATES.map(c => c.name));
        let results = CANDIDATES.map(candidate => meassureEfficiency(candidate.factory));
        let rows = SCENARIOS.map((scenario, i) => {
            return [i, rectSizeSum[i]].concat(results.map(resultCandidate => {
                let result = resultCandidate[i];
                return `${toPercent(result.efficiency)} (${result.bins} bins)`;
            }));
        }).concat([["sum", ""].concat(results.map(result => {
            let usedSize = result.reduce((memo, data) => memo + data.usedSize, 0);
            let rectSize = result.reduce((memo, data) => memo + data.rectSize, 0);
            return toPercent(rectSize / usedSize);
        }))]);

        console.log(new AsciiTable({ heading, rows }).toString());
    });

    function meassureEfficiency (factory) {
        return SCENARIOS.map((scenario, i) => {
            let packer: MaxRectsPacker = factory();
            packer.addArray(scenario);

            let bins: number = packer.bins.length;
            let rectSize: number = rectSizeSum[i];
            let usedSize: number = packer.bins.reduce((memo, bin) => memo + bin.width * bin.height, 0);
            let efficiency: number = rectSize / usedSize;
            return { bins, rectSize, usedSize, efficiency };
        });
    }

    function toPercent (input: number): string {
        return Math.round(input * 1000) / 10 + "%";
    }
});
