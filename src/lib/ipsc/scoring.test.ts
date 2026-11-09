import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreRun } from "./scoring.ts";
import { zoneAt } from "./geometry.ts";
import { formatHf, parseSeconds, dayLabel } from "./format.ts";
import type { Run, Shot, Zone } from "./types.ts";

const paper = (id: string, requiredHits: number) => ({ id, label: id, requiredHits });
const hit = (targetId: string, zone: Zone): Shot => ({
  id: Math.random().toString(),
  targetId,
  zone,
  x: 0,
  y: 0,
});

function run(partial: Partial<Run>): Run {
  return {
    id: "r",
    drillId: "d",
    drillName: "d",
    blurb: "",
    countMode: "all",
    papers: [paper("p1", 2)],
    steelDown: [],
    distanceM: 7,
    start: "hylster",
    at: "2026-01-01T00:00:00Z",
    power: "minor",
    timeSec: 2,
    shots: [],
    noShootHits: 0,
    procedurals: 0,
    note: "",
    ...partial,
  };
}

describe("scoreRun", () => {
  it("scores minor and major zones", () => {
    const shots = [hit("p1", "A"), hit("p1", "C")];
    assert.equal(scoreRun(run({ shots })).points, 8);
    assert.equal(scoreRun(run({ shots, power: "major" })).points, 9);
    assert.equal(scoreRun(run({ shots })).hitFactor, 4);
  });

  it("counts missing hits as misses", () => {
    const score = scoreRun(
      run({ papers: [paper("p1", 3)], shots: [hit("p1", "A"), hit("p1", "A")] }),
    );
    assert.equal(score.misses, 1);
    assert.equal(score.points, 0); // 10 - 10
  });

  it("keeps only the best hits in Comstock mode", () => {
    const score = scoreRun(
      run({ countMode: "best", shots: [hit("p1", "D"), hit("p1", "A"), hit("p1", "C")] }),
    );
    assert.equal(score.A, 1);
    assert.equal(score.C, 1);
    assert.equal(score.D, 0);
    assert.equal(score.discarded, 1);
    assert.equal(score.points, 8);
  });

  it("scores steel and penalties, and never goes negative", () => {
    const score = scoreRun(
      run({ papers: [], steelDown: [true, false], noShootHits: 1, procedurals: 1 }),
    );
    assert.equal(score.steel, 1);
    assert.equal(score.misses, 1);
    assert.equal(score.points, 0);
    assert.equal(scoreRun(run({ papers: [], steelDown: [true, true] })).points, 10);
  });

  it("gives hit factor 0 without a time", () => {
    assert.equal(scoreRun(run({ timeSec: 0, shots: [hit("p1", "A")] })).hitFactor, 0);
  });
});

describe("zoneAt", () => {
  it("finds the zones of the classic target", () => {
    assert.equal(zoneAt(225, 250), "A");
    assert.equal(zoneAt(100, 250), "C");
    assert.equal(zoneAt(30, 300), "D");
    assert.equal(zoneAt(5, 5), null);
    assert.equal(zoneAt(-1, 300), null);
    assert.equal(zoneAt(150, 250), "A"); // on the line counts up
  });
});

describe("format", () => {
  it("parses decimal comma and point", () => {
    assert.equal(parseSeconds("3,42"), 3.42);
    assert.equal(parseSeconds("3.4"), 3.4);
    assert.equal(parseSeconds("0"), null);
    assert.equal(parseSeconds(""), null);
  });
  it("formats hit factor with four decimals", () => {
    assert.equal(formatHf(4), "4,0000");
  });
  it("labels today and yesterday", () => {
    const now = new Date(2026, 5, 10, 12);
    assert.equal(dayLabel(new Date(2026, 5, 10, 8).toISOString(), now), "I dag");
    assert.equal(dayLabel(new Date(2026, 5, 9, 8).toISOString(), now), "I går");
  });
});
