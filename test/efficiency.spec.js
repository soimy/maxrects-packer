// oxlint-disable no-console -- this file prints comparison tables on purpose
import { describe, test } from "vitest";
import { MaxRectsPacker, PACKING_LOGIC } from "../src/maxrects-packer";
import AsciiTable from "ascii-table";
import SCENARIOS from "./scenarios.json";

const rectSizeSum = SCENARIOS.map((scenario) => scenario.reduce((memo, rect) => memo + rect.width * rect.height, 0));

// One table for both logics. The area and edge candidate lists used to be written out in full twice,
// 85 lines each, identical apart from `logic`.
const CANDIDATE_SHAPES = [
    { name: "1024x2048:0", width: 1024, height: 2048, padding: 0, square: false },
    { name: "1024x2048:1", width: 1024, height: 2048, padding: 1, square: false },
    { name: "1024x2048:1:Rot", width: 1024, height: 2048, padding: 1, square: true, allowRotation: true },
    { name: "1024x1024:0", width: 1024, height: 1024, padding: 0, square: false },
    { name: "1024x1024:1", width: 1024, height: 1024, padding: 1, square: false },
    { name: "1024x1024:1:Rot", width: 1024, height: 1024, padding: 1, square: true, allowRotation: true },
    { name: "2048:2048:1", width: 2048, height: 2048, padding: 1, square: false },
    { name: "2048:2048:1:Rot", width: 2048, height: 2048, padding: 1, square: true, allowRotation: true }
];

const candidatesFor = (logic) =>
    CANDIDATE_SHAPES.map(({ name, width, height, padding, square, allowRotation = false }) => ({
        name,
        factory: () =>
            new MaxRectsPacker(width, height, padding, {
                smart: true,
                pot: true,
                square,
                allowRotation,
                logic
            })
    }));

describe("Efficiency", () => {
    const AREA_CANDIDATES = candidatesFor(PACKING_LOGIC.MAX_AREA);
    const EDGE_CANDIDATES = candidatesFor(PACKING_LOGIC.MAX_EDGE);

    test.skip("area logic", () => {
        const heading = ["#", "size"].concat(AREA_CANDIDATES.map((c) => c.name));
        const results = AREA_CANDIDATES.map((candidate) => measureEfficiency(candidate.factory));
        const rows = createRows(results);

        console.log(new AsciiTable({ heading, rows }).toString());
    });

    test.skip("edge logic", () => {
        const heading = ["#", "size"].concat(EDGE_CANDIDATES.map((c) => c.name));
        const results = EDGE_CANDIDATES.map((candidate) => measureEfficiency(candidate.factory));
        const rows = createRows(results);

        console.log(new AsciiTable({ heading, rows }).toString());
    });

    test("combined best of", () => {
        const heading = ["#", "size"].concat(AREA_CANDIDATES.map((c) => c.name));
        const results1 = EDGE_CANDIDATES.map((candidate) => measureEfficiency(candidate.factory));
        const results2 = AREA_CANDIDATES.map((candidate) => measureEfficiency(candidate.factory));
        const results = results1.map((scenario, scenarioIndex) =>
            scenario.map((result1, resultIndex) => {
                const result2 = results2[scenarioIndex][resultIndex];
                if (result1.bins < result2.bins) {
                    result1.method = "E";
                    return result1;
                } else if (result1.bins > result2.bins) {
                    result2.method = "A";
                    return result2;
                } else if (result1.efficiency > result2.efficiency) {
                    result1.method = "E";
                    return result1;
                } else if (result1.efficiency < result2.efficiency) {
                    result2.method = "A";
                    return result2;
                } else {
                    result1.method = "";
                    return result1;
                }
            })
        );
        const rows = createRows(results);

        console.log(new AsciiTable({ heading, rows }).toString());
    });
});

function measureEfficiency(factory) {
    return SCENARIOS.map((scenario, i) => {
        const packer = factory();
        packer.addArray(scenario);

        const bins = packer.bins.length;
        const rectSize = rectSizeSum[i];
        const usedSize = packer.bins.reduce((memo, bin) => memo + bin.width * bin.height, 0);
        const efficiency = rectSize / usedSize;
        return { bins, rectSize, usedSize, efficiency };
    });
}

function toPercent(input) {
    return Math.round(input * 1000) / 10 + "%";
}

function createRows(results) {
    return SCENARIOS.map((scenario, i) => {
        return [i, rectSizeSum[i]].concat(
            results.map((resultCandidate) => {
                const result = resultCandidate[i];
                return `${toPercent(result.efficiency)} (${result.bins} bins)${result.method}`;
            })
        );
    }).concat([
        ["sum", ""].concat(
            results.map((result) => {
                const usedSize = result.reduce((memo, data) => memo + data.usedSize, 0);
                const rectSize = result.reduce((memo, data) => memo + data.rectSize, 0);
                const totalBins = result.reduce((memo, data) => memo + data.bins, 0);
                return `${toPercent(rectSize / usedSize)} (${totalBins} bins)`;
            })
        )
    ]);
}
