import { expect } from 'chai';
import { MaxRectsPacker } from '../src/maxrects_packer';

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
            { name: "1024x2048:0", factory: () => new MaxRectsPacker(1024, 2048, 0) }
        ];

        let heading = ["#", "size"].concat(CANDIDATES.map(c => c.name));
        let results = CANDIDATES.map(candidate => {});
    });

    function meassureEfficiency (factory) {
        return SCENARIOS.map((scenario, i) => {
            let packer: MaxRectsPacker = factory();
            packer.addArray(scenario);

            let bins: number = packer.bins.length;
            let rectSize: number = rectSizeSum[i];
        });
    }
});
