import test from "node:test";
import assert from "node:assert/strict";

import {
  bootstrapConfidenceInterval,
  buildBinarySeries,
  pairedBootstrapDifference,
} from "../benchmarks/lib/stats.mjs";

test("buildBinarySeries creates the expected protected-instruction vector", () => {
  assert.deepEqual(buildBinarySeries(5, 3), [1, 1, 1, 0, 0]);
});

test("bootstrapConfidenceInterval is stable for deterministic success series", () => {
  const interval = bootstrapConfidenceInterval([1, 1, 1, 1], undefined, {
    iterations: 200,
    seed: 7,
    transform: (value) => value * 100,
  });

  assert.deepEqual(interval, {
    point: 100,
    lower: 100,
    upper: 100,
    iterations: 200,
    confidenceLevelPct: 95,
  });
});

test("pairedBootstrapDifference reports uplift on a repaired failure set", () => {
  const interval = pairedBootstrapDifference([1, 1, 0, 0], [1, 1, 1, 1], undefined, {
    iterations: 500,
    seed: 11,
    transform: (value) => value * 100,
  });

  assert.equal(interval.point, 50);
  assert.ok(interval.lower <= 50);
  assert.ok(interval.upper >= 50);
  assert.equal(interval.confidenceLevelPct, 95);
});
