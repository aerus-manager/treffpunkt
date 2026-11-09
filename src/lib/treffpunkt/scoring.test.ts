import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeFace, scoreShot } from "./faces.ts";
import { programById } from "./programs.ts";
import {
  createSession,
  positionAfter,
  reopenLastSeries,
  sealSeries,
  sessionPoints,
  type RingShot,
} from "./session.ts";
import { bestByProgram } from "./stats.ts";

describe("scoreShot", () => {
  const air = makeFace("air-pistol", 4.5);
  it("gives 10 and inner ten in the centre", () => {
    assert.deepEqual(scoreShot(air, 0, 0), { score: 10, innerTen: true });
  });
  it("counts a pellet touching the ring line up", () => {
    // 9-ring radius 13.75 + pellet radius 2.25 = 16
    assert.equal(scoreShot(air, 16, 0).score, 9);
    assert.equal(scoreShot(air, 16.1, 0).score, 8);
  });
  it("misses outside the board", () => {
    assert.equal(scoreShot(air, 100, 0).score, 0);
  });
  it("starts the rapid face at 5", () => {
    const rapid = makeFace("rapid", 5.6);
    assert.equal(scoreShot(rapid, 240, 0).score, 5);
    assert.equal(scoreShot(rapid, 0, 0).score, 10);
  });
});

const shot = (score: number): RingShot => ({
  xMm: 0,
  yMm: 0,
  score,
  innerTen: false,
  targetIndex: 0,
});

describe("session flow", () => {
  const program = programById("finpistol")!;

  it("advances through stages and finishes", () => {
    let session = createSession(program, " Bane ");
    assert.equal(session.place, "Bane");
    for (let i = 0; i < 12; i += 1) {
      session = { ...session, current: [shot(10), shot(9), shot(8), shot(7), shot(6)] };
      session = sealSeries(session, program);
    }
    assert.equal(session.status, "done");
    assert.equal(sessionPoints(session).points, 12 * 40);
  });

  it("refuses to seal an incomplete series", () => {
    const session = { ...createSession(program, ""), current: [shot(10)] };
    assert.equal(sealSeries(session, program), session);
  });

  it("reopens the last series across a stage boundary", () => {
    let session = createSession(program, "");
    for (let i = 0; i < 6; i += 1) {
      session = sealSeries(
        { ...session, current: [shot(9), shot(9), shot(9), shot(9), shot(9)] },
        program,
      );
    }
    assert.equal(session.stageIndex, 1);
    const reopened = reopenLastSeries(session, program);
    assert.equal(reopened.stageIndex, 0);
    assert.equal(reopened.seriesDoneInStage, 5);
    assert.equal(reopened.current.length, 5);
    assert.equal(reopened.sealed.length, 5);
  });

  it("maps sealed counts to positions", () => {
    assert.deepEqual(positionAfter(program, 0), {
      stageIndex: 0,
      seriesDoneInStage: 0,
      done: false,
    });
    assert.deepEqual(positionAfter(program, 7), {
      stageIndex: 1,
      seriesDoneInStage: 1,
      done: false,
    });
    assert.equal(positionAfter(program, 12).done, true);
  });

  it("picks the best finished session per program", () => {
    const a = {
      ...createSession(program, ""),
      status: "done" as const,
      sealed: [{ stageIndex: 0, shots: [shot(10)] }],
    };
    const b = {
      ...createSession(program, ""),
      status: "done" as const,
      sealed: [{ stageIndex: 0, shots: [shot(9)] }],
    };
    const open = {
      ...createSession(program, ""),
      sealed: [{ stageIndex: 0, shots: [shot(10), shot(10)] }],
    };
    assert.equal(bestByProgram([a, b, open]).get(program.id)?.sessionId, a.id);
  });
});
