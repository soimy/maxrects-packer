"use strict";

let MaxRectsPacker = require("../dist/maxrects-packer").MaxRectsPacker;
let PACKING_LOGIC = require("../dist/maxrects-packer").PACKING_LOGIC;
let AsciiTable = require("ascii-table")

const SCENARIOS = require("./scenarios.json");

let rectSizeSum = SCENARIOS.map(scenario => {
    return scenario.reduce((memo, rect) => memo + rect.width * rect.height, 0);
});

describe('Efficiency', () => {
    const AREA_CANDIDATES = [
        {name: "1024x2048:0", factory: () => new MaxRectsPacker(1024, 2048, 0, { smart: true, pot: true, square: false, logic: PACKING_LOGIC.MAX_AREA })},
        {name: "1024x2048:1", factory: () => new MaxRectsPacker(1024, 2048, 1, { smart: true, pot: true, square: false, logic: PACKING_LOGIC.MAX_AREA })},
        {name: "1024x2048:1:Rot", factory: () => new MaxRectsPacker(1024, 2048, 1, { smart: true, pot: true, square: true, allowRotation: true, logic: PACKING_LOGIC.MAX_AREA })},
        {name: "1024x1024:0", factory: () => new MaxRectsPacker(1024, 1024, 0, { smart: true, pot: true, square: false, logic: PACKING_LOGIC.MAX_AREA })},
        {name: "1024x1024:1", factory: () => new MaxRectsPacker(1024, 1024, 1, { smart: true, pot: true, square: false, logic: PACKING_LOGIC.MAX_AREA })},
        {name: "1024x1024:1:Rot", factory: () => new MaxRectsPacker(1024, 1024, 1, { smart: true, pot: true, square: true, allowRotation: true, logic: PACKING_LOGIC.MAX_AREA })},
        {name: "2048:2048:1", factory: () => new MaxRectsPacker(2048, 2048, 1, { smart: true, pot: true, square: false, logic: PACKING_LOGIC.MAX_AREA })},
        {name: "2048:2048:1:Rot", factory: () => new MaxRectsPacker(2048, 2048, 1, { smart: true, pot: true, square: true, allowRotation: true, logic: PACKING_LOGIC.MAX_AREA })}
    ];

    const EDGE_CANDIDATES = [
        {name: "1024x2048:0", factory: () => new MaxRectsPacker(1024, 2048, 0, { smart: true, pot: true, square: false, logic: PACKING_LOGIC.MAX_EDGE })},
        {name: "1024x2048:1", factory: () => new MaxRectsPacker(1024, 2048, 1, { smart: true, pot: true, square: false, logic: PACKING_LOGIC.MAX_EDGE })},
        {name: "1024x2048:1:Rot", factory: () => new MaxRectsPacker(1024, 2048, 1, { smart: true, pot: true, square: true, allowRotation: true, logic: PACKING_LOGIC.MAX_EDGE })},
        {name: "1024x1024:0", factory: () => new MaxRectsPacker(1024, 1024, 0, { smart: true, pot: true, square: false, logic: PACKING_LOGIC.MAX_EDGE })},
        {name: "1024x1024:1", factory: () => new MaxRectsPacker(1024, 1024, 1, { smart: true, pot: true, square: false, logic: PACKING_LOGIC.MAX_EDGE })},
        {name: "1024x1024:1:Rot", factory: () => new MaxRectsPacker(1024, 1024, 1, { smart: true, pot: true, square: true, allowRotation: true, logic: PACKING_LOGIC.MAX_EDGE })},
        {name: "2048:2048:1", factory: () => new MaxRectsPacker(2048, 2048, 1, { smart: true, pot: true, square: false, logic: PACKING_LOGIC.MAX_EDGE })},
        {name: "2048:2048:1:Rot", factory: () => new MaxRectsPacker(2048, 2048, 1, { smart: true, pot: true, square: true, allowRotation: true, logic: PACKING_LOGIC.MAX_EDGE })}
    ];

    test.skip('area logic', () => {
        let heading = ["#", "size"].concat(AREA_CANDIDATES.map(c => c.name));
        let results = AREA_CANDIDATES.map(candidate => meassureEfficiency(candidate.factory));
        let rows = createRows(results);
        
        console.log(new AsciiTable({ heading, rows }).toString());
    });

    test.skip('edge logic', () => {
        let heading = ["#", "size"].concat(EDGE_CANDIDATES.map(c => c.name));
        let results = EDGE_CANDIDATES.map(candidate => meassureEfficiency(candidate.factory));
        let rows = createRows(results);

        console.log(new AsciiTable({ heading, rows }).toString());
    });

    test('combined best of', () => {
        let heading = ["#", "size"].concat(AREA_CANDIDATES.map(c => c.name));
        let results1 = EDGE_CANDIDATES.map(candidate => meassureEfficiency(candidate.factory));
        let results2 = AREA_CANDIDATES.map(candidate => meassureEfficiency(candidate.factory));
        let results = results1.map((scenario, scenarioIndex) => scenario.map((result1, resultIndex) => {
            const result2 = results2[scenarioIndex][resultIndex];
            if (result1.bins < result2.bins) {
                return result1;
            } else if (result1.bins > result2.bins) {
                return result2;
            } else if (result1.efficieny > result2.efficieny) {
                return result1;
            } else if (result1.efficieny < result2.efficieny) {
                return result2;
            } else {
                return result1;
            }
        }));
        let rows = createRows(results);

        console.log(new AsciiTable({ heading, rows }).toString());
    });
});

function meassureEfficiency (factory) {
    return SCENARIOS.map((scenario, i) => {
        let packer = factory();
        packer.addArray(scenario);

        let bins = packer.bins.length;
        let rectSize = rectSizeSum[i];
        let usedSize = packer.bins.reduce((memo, bin) => memo + bin.width * bin.height, 0);
        let efficieny = rectSize / usedSize;
        return {bins, rectSize, usedSize, efficieny};
    });
}

function toPercent (input) {
    return Math.round(input * 1000) / 10 + "%";
}

function createRows (results) {
    return SCENARIOS.map((scenario, i) => {
        return [i, rectSizeSum[i]].concat(results.map(resultCandidate => {
            let result = resultCandidate[i];
            return `${toPercent(result.efficieny)} (${result.bins} bins)`;
        }));
    }).concat([["sum", ""].concat(results.map(result => {
        let usedSize = result.reduce((memo, data) => memo + data.usedSize, 0);
        let rectSize = result.reduce((memo, data) => memo + data.rectSize, 0);
        let totalBins = result.reduce((memo, data) => memo + data.bins, 0);
        return `${toPercent(rectSize / usedSize)} (${totalBins} bins)`;
    }))]);
}