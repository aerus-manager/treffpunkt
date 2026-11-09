import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { feltCourse, holdTally, maxPoints, shotOnHold } from "./felt.ts";

describe("norgesfelt", () => {
  it("scores a hit plus the figure, and an inner hit as tiebreak only", () => {
    const tally = holdTally([
      { xCm: 1, yCm: 1, figureIndex: 0, inner: true },
      { xCm: 2, yCm: 2, figureIndex: 0, inner: false },
      { xCm: 9, yCm: 9, figureIndex: null, inner: false },
    ]);
    assert.equal(tally.treff, 2);
    assert.equal(tally.figures, 1);
    assert.equal(tally.inner, 1);
    assert.equal(tally.points, 3);
  });

  it("matches the published maxima, 80 and 70", () => {
    const course = feltCourse("norgesfelt-2026");
    assert.ok(course);
    assert.equal(maxPoints(course, "1"), 80);
    assert.equal(maxPoints(course, "2"), 70);
  });

  it("hits the hare and misses the cardboard beside it", () => {
    const hold = feltCourse("norgesfelt-2026")?.holds[0];
    assert.ok(hold);
    assert.equal(shotOnHold(hold, 17, 20).figureIndex, 0);
    assert.equal(shotOnHold(hold, 1, 1).figureIndex, null);
  });
});
