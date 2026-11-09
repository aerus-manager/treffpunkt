import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { zoneAt } from "./geometry.ts";
import { scoreRun } from "./scoring.ts";

describe("IPSC zones", () => {
  it("scores the centre as alpha and the rim as delta", () => {
    assert.equal(zoneAt(225, 220), "A");
    assert.equal(zoneAt(225, 340), "A");
    assert.equal(zoneAt(100, 200), "C");
    assert.equal(zoneAt(225, 5), "C");
    assert.equal(zoneAt(30, 280), "D");
    assert.equal(zoneAt(225, 500), "D");
    assert.equal(zoneAt(10, 10), null);
  });
});

describe("hit factor", () => {
  const paper = { id: "t", requiredHits: 6 };

  it("scores a minor Bill Drill with four alphas and two charlies", () => {
    const score = scoreRun({
      power: "minor",
      timeSec: 2.48,
      countMode: "all",
      papers: [paper],
      shots: [
        { targetId: "t", zone: "A" },
        { targetId: "t", zone: "A" },
        { targetId: "t", zone: "A" },
        { targetId: "t", zone: "A" },
        { targetId: "t", zone: "C" },
        { targetId: "t", zone: "C" },
      ],
      steelDown: [],
      noShootHits: 0,
      procedurals: 0,
    });
    assert.equal(score.points, 26);
    assert.equal(score.misses, 0);
    assert.equal(score.hitFactor.toFixed(4), "10.4839");
  });

  it("counts a short string as misses and lifts C and D on major", () => {
    const five = scoreRun({
      power: "minor",
      timeSec: 2.48,
      countMode: "all",
      papers: [paper],
      shots: Array.from({ length: 5 }, () => ({ targetId: "t", zone: "A" as const })),
      steelDown: [],
      noShootHits: 0,
      procedurals: 0,
    });
    assert.equal(five.points, 15);
    assert.equal(five.misses, 1);
    assert.equal(five.hitFactor.toFixed(4), "6.0484");

    const major = scoreRun({
      power: "major",
      timeSec: 2.48,
      countMode: "all",
      papers: [paper],
      shots: [
        { targetId: "t", zone: "A" },
        { targetId: "t", zone: "A" },
        { targetId: "t", zone: "A" },
        { targetId: "t", zone: "A" },
        { targetId: "t", zone: "C" },
        { targetId: "t", zone: "C" },
      ],
      steelDown: [],
      noShootHits: 0,
      procedurals: 0,
    });
    assert.equal(major.points, 28);
    assert.equal(major.hitFactor.toFixed(4), "11.2903");
  });

  it("keeps only the best hits in Comstock and ignores extras", () => {
    const score = scoreRun({
      power: "minor",
      timeSec: 4,
      countMode: "best",
      papers: [{ id: "t", requiredHits: 2 }],
      shots: [
        { targetId: "t", zone: "D" },
        { targetId: "t", zone: "A" },
        { targetId: "t", zone: "C" },
      ],
      steelDown: [true, false],
      noShootHits: 1,
      procedurals: 1,
    });
    assert.equal(score.A, 1);
    assert.equal(score.C, 1);
    assert.equal(score.D, 0);
    assert.equal(score.discarded, 1);
    assert.equal(score.steel, 1);
    assert.equal(score.misses, 1);
    assert.equal(score.points, 5 + 3 + 5 - 10 - 10 - 10);
  });
});
