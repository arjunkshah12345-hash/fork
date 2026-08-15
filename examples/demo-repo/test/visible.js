import assert from "node:assert/strict";
import test from "node:test";

import { mergeWindows } from "../src/merge-windows.js";

test("sorts windows numerically before merging", () => {
  assert.deepEqual(
    mergeWindows([
      [100, 120],
      [20, 40],
      [35, 60],
    ]),
    [
      [20, 60],
      [100, 120],
    ],
  );
});

test("merges touching half-open windows", () => {
  assert.deepEqual(
    mergeWindows([
      [10, 20],
      [20, 30],
    ]),
    [[10, 30]],
  );
});
