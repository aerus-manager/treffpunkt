import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashToView, viewToHash, type View } from "./nav.ts";

describe("hash routing", () => {
  const views: View[] = [
    { name: "home" },
    { name: "category", category: "ipsc" },
    { name: "setup", programId: "luftpistol-60" },
    { name: "series", sessionId: "a b" },
    { name: "session", sessionId: "x" },
    { name: "felt-setup", courseId: "norgesfelt-2026" },
    { name: "felt", sessionId: "f1" },
    { name: "felt-detail", sessionId: "f1" },
    { name: "weapons" },
    { name: "log" },
    { name: "settings" },
    { name: "form" },
    { name: "form", drillId: "d1" },
    { name: "shoot", drillId: "d1" },
    { name: "shoot", drillId: "d1", runId: "r1" },
    { name: "run", runId: "r1" },
  ];
  for (const view of views) {
    it(`round-trips ${viewToHash(view)}`, () => {
      assert.deepEqual(hashToView(viewToHash(view)), view);
    });
  }
  it("falls back to home on junk", () => {
    assert.deepEqual(hashToView("#/nope"), { name: "home" });
    assert.deepEqual(hashToView("#/kategori/xyz"), { name: "home" });
    assert.deepEqual(hashToView(""), { name: "home" });
  });
});
