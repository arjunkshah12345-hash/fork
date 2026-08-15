import assert from "node:assert/strict";
import test from "node:test";

import { mergeWindows } from "../src/merge-windows.js";

test("does not mutate the caller's outer array or tuples", () => {
  const input = [
    [30, 40],
    [10, 35],
  ];
  const snapshot = structuredClone(input);

  mergeWindows(input);

  assert.deepEqual(input, snapshot);
});

test("rejects malformed windows with an actionable TypeError", () => {
  for (const malformed of [null, [[1]], [[4, 4]], [[8, 2]], [[0, Infinity]], [["1", 2]]]) {
    assert.throws(
      () => mergeWindows(malformed),
      (error) =>
        error instanceof TypeError &&
        error.message ===
          "windows must contain [start, end] pairs of finite numbers where start < end",
    );
  }
});

test("returns fresh tuples even when no merge is needed", () => {
  const tuple = [10, 20];
  const result = mergeWindows([tuple]);

  assert.notEqual(result[0], tuple);
  assert.deepEqual(result, [[10, 20]]);
});
