// oxlint-disable no-console -- this file prints comparison tables on purpose
import { describe, expect, test } from "vitest";
import { MaxRectsPacker, PACKING_LOGIC } from "../src/maxrects-packer";
import AsciiTable from "ascii-table";
import SCENARIOS from "./scenarios.json";

const rectSizeSum = SCENARIOS.map((scenario) => scenario.reduce((memo, rect) => memo + rect.width * rect.height, 0));

// One table for both logics. The area and edge candidate lists used to be written out in full twice,
// 85 lines each, identical apart from `logic`.
const CANDIDATE_SHAPES = [
    { name: "1024x2048:0", width: 1024, height: 2048, padding: 0, square: false },
    { name: "1024x2048:1", width: 1024, height: 2048, padding: 1, square: false },
    // The only shape whose maxWidth differs from its maxHeight while asking for square bins, so the
    // only one where growing a bin can hit the maxWidth cap and leave it holding rects it cannot fit.
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

    test("every candidate packs every scenario completely, and never claims more area than it was given", () => {
        for (const logic of [PACKING_LOGIC.MAX_EDGE, PACKING_LOGIC.MAX_AREA]) {
            for (const candidate of candidatesFor(logic)) {
                measureEfficiency(candidate.factory).forEach((result, scenarioIndex) => {
                    const replay = `${candidate.name} / scenario ${scenarioIndex}`;
                    // Nothing is ever dropped: a rect that does not fit goes into an
                    // OversizedElementBin rather than being discarded.
                    expect(result.placed, replay).toBe(SCENARIOS[scenarioIndex].length);
                    // A bin that reports less than it holds shows up as a rect outside its own bin, so
                    // count those first: they are the failure the efficiency below can only hint at.
                    expect(result.escaping, replay).toBe(0);
                    // `usedSize` sums the bin areas and `rectSize` the rect areas, so an efficiency
                    // above 1 means a bin holds more area than it reports. No candidate may exceed 1.
                    expect(result.efficiency, replay).toBeLessThanOrEqual(1);
                });
            }
        }
    });

    test("combined best of", () => {
        const heading = ["#", "size"].concat(AREA_CANDIDATES.map((c) => c.name));
        const edgeResults = EDGE_CANDIDATES.map((candidate) => measureEfficiency(candidate.factory));
        const areaResults = AREA_CANDIDATES.map((candidate) => measureEfficiency(candidate.factory));
        const results = edgeResults.map((edge, candidateIndex) =>
            edge.map((result1, scenarioIndex) => {
                const result2 = areaResults[candidateIndex][scenarioIndex];
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

        // The pick follows the selection above, which is lexicographic: fewer bins wins outright —
        // even at a lower efficiency — and efficiency only decides an equal-bin tie. Demanding the
        // highest efficiency unconditionally would reject a correct fewer-bin choice.
        results.forEach((candidateResults, candidateIndex) =>
            candidateResults.forEach((best, scenarioIndex) => {
                const edge = edgeResults[candidateIndex][scenarioIndex];
                const area = areaResults[candidateIndex][scenarioIndex];
                const replay = `${AREA_CANDIDATES[candidateIndex].name} / scenario ${scenarioIndex}`;
                expect(best.bins, replay).toBe(Math.min(edge.bins, area.bins));
                if (edge.bins === area.bins) {
                    expect(best.efficiency, replay).toBe(Math.max(edge.efficiency, area.efficiency));
                }
            })
        );

        console.log(new AsciiTable({ heading, rows }).toString());
    });
});

function measureEfficiency(factory) {
    return SCENARIOS.map((scenario, i) => {
        const packer = factory();
        // addArray() writes x/y/rot back onto the rect objects and a rotated rect carries swapped
        // dimensions afterwards, so every candidate has to run on its own copy of the fixture —
        // otherwise a candidate would measure what the previous one left behind.
        packer.addArray(scenario.map((rect) => ({ ...rect })));

        const bins = packer.bins.length;
        const rectSize = rectSizeSum[i];
        const usedSize = packer.bins.reduce((memo, bin) => memo + bin.width * bin.height, 0);
        const placed = packer.bins.reduce((memo, bin) => memo + bin.rects.length, 0);
        const escaping = packer.bins.reduce(
            (memo, bin) =>
                memo +
                bin.rects.filter((rect) => rect.x + rect.width > bin.width || rect.y + rect.height > bin.height).length,
            0
        );
        const efficiency = rectSize / usedSize;
        return { bins, rectSize, usedSize, placed, escaping, efficiency };
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
