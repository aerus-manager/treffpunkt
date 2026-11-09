import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeFace, scoreShot } from "./faces.ts";
import { PROGRAMS } from "./programs.ts";
import { createSession, positionAfter, reopenLastSeries, sealSeries, sessionPoints } from "./session.ts";
import { bestByProgram } from "./stats.ts";

describe("ring gauge", () => {
  it("scores the air-pistol ten inside the gauge and a nine just outside it", () => {
    const face = makeFace("air-pistol", 4.5);
    assert.deepEqual(scoreShot(face, 0, 0), { score: 10, innerTen: true });
    assert.equal(scoreShot(face, 8, 0).score, 10);
    assert.equal(scoreShot(face, 8.1, 0).score, 9);
    assert.deepEqual(scoreShot(face, 200, 0), { score: 0, innerTen: false });
  });

  it("gives the larger grovpistol gauge the higher ring", () => {
    const fin = makeFace("precision", 5.6);
    const grov = makeFace("precision", 9.65);
    assert.equal(scoreShot(fin, 28, 0).score, 9);
    assert.equal(scoreShot(grov, 28, 0).score, 10);
  });

  it("treats the rapid face as rings 5 to 10", () => {
    const face = makeFace("rapid", 5.6);
    assert.equal(scoreShot(face, 0, 0).score, 10);
    assert.equal(scoreShot(face, 400, 0).score, 0);
  });
});

describe("series", () => {
  it("seals a five-shot series and keeps the running total", () => {
    const program = PROGRAMS.find((item) => item.id === "finpistol");
    assert.ok(program);
    let session = createSession(program, "Løvenskiold");
    session = {
      ...session,
      current: [0, 1, 2, 3, 4].map((index) => ({
        xMm: index,
        yMm: 0,
        score: 10 - index,
        innerTen: index === 0,
        targetIndex: 0,
      })),
    };
    session = sealSeries(session, program);
    assert.equal(session.sealed.length, 1);
    assert.equal(session.seriesDoneInStage, 1);
    assert.equal(session.status, "open");
    assert.equal(sessionPoints(session).points, 40);
    assert.equal(sessionPoints(session).inner, 1);
  });

  it("reopens the last series and marks overtime when the clock ran out", () => {
    const program = PROGRAMS.find((item) => item.id === "finpistol");
    assert.ok(program);
    let session = createSession(program, "");
    const shot = (score: number) => ({ xMm: 0, yMm: 0, score, innerTen: false, targetIndex: 0 });
    for (let index = 0; index < 6; index += 1) {
      session = sealSeries(
        { ...session, current: [shot(9), shot(9), shot(9), shot(9), shot(9)] },
        program,
        { overTime: index === 5, elapsedMs: 21000 },
      );
    }
    assert.equal(session.stageIndex, 1);
    assert.equal(session.sealed[5]?.overTime, true);
    const reopened = reopenLastSeries(session, program);
    assert.equal(reopened.stageIndex, 0);
    assert.equal(reopened.seriesDoneInStage, 5);
    assert.equal(reopened.current.length, 5);
    assert.equal(reopened.status, "open");
    assert.deepEqual(positionAfter(program, 12), {
      stageIndex: program.stages.length,
      seriesDoneInStage: 0,
      done: true,
    });
    const done = { ...session, status: "done" as const };
    const worse = { ...createSession(program, ""), status: "done" as const, sealed: session.sealed.slice(0, 1) };
    assert.equal(bestByProgram([worse, done]).get(program.id)?.sessionId, done.id);
  });
});
