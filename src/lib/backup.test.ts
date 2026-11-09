import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeById, parseBackup, serializeBackup } from "./backup.ts";

const goodRun = {
  id: "r1",
  drillId: "bill-drill",
  drillName: "Bill Drill",
  countMode: "all",
  papers: [{ id: "p", label: "Skive", requiredHits: 6 }],
  steelDown: [],
  at: "2026-01-01T10:00:00Z",
  power: "minor",
  timeSec: 3,
  shots: [{ id: "s", targetId: "p", zone: "A", x: 1, y: 2 }],
  noShootHits: 0,
  procedurals: 0,
  note: "",
};

describe("parseBackup", () => {
  it("round-trips a serialized diary", () => {
    const data = parseBackup(
      serializeBackup({
        profiles: [{ id: "a", name: "A" }],
        customDrills: [],
        runs: [goodRun as never],
        ringSessions: [],
      }),
    );
    assert.equal(data.runs.length, 1);
    assert.equal(data.runs[0].shots[0].zone, "A");
    assert.equal(data.profiles[0].name, "A");
  });

  it("rejects files that are not a diary", () => {
    assert.throws(() => parseBackup("not json"), /gyldig JSON/);
    assert.throws(() => parseBackup('{"hello":1}'), /Treffpunkt/);
    assert.throws(() => parseBackup("[1,2]"), /Treffpunkt/);
  });

  it("drops records that would crash the app and repairs the rest", () => {
    const data = parseBackup(
      JSON.stringify({
        app: "treffpunkt",
        runs: [
          {
            ...goodRun,
            papers: "nope",
            shots: [{ id: "x", targetId: "p", zone: "Q" }],
            power: "huge",
          },
          { id: "no-date", drillId: "d" },
          null,
          42,
        ],
        ringSessions: [
          {
            id: "s1",
            programId: "luftpistol-60",
            at: "2026-01-01T10:00:00Z",
            sealed: "x",
            current: [{ score: "10" }],
          },
        ],
        customDrills: [{ id: "d1" }],
      }),
    );
    assert.equal(data.runs.length, 1);
    assert.deepEqual(data.runs[0].papers, []);
    assert.deepEqual(data.runs[0].shots, []);
    assert.equal(data.runs[0].power, "minor");
    assert.equal(data.ringSessions.length, 1);
    assert.deepEqual(data.ringSessions[0].sealed, []);
    assert.deepEqual(data.ringSessions[0].current, []);
    assert.equal(data.ringSessions[0].touched, "2026-01-01T10:00:00Z");
    assert.equal(data.customDrills.length, 0);
  });
});

describe("mergeById", () => {
  it("keeps the most recently touched copy", () => {
    const local = [{ id: "a", touched: "2026-02-01" }];
    const older = [
      { id: "a", touched: "2026-01-01" },
      { id: "b", touched: "2026-01-01" },
    ];
    const merged = mergeById(local, older);
    assert.equal(merged.added, 1);
    assert.equal(merged.list.find((item) => item.id === "a")?.touched, "2026-02-01");
  });
});
