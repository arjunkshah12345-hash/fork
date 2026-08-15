# Repair `mergeWindows`

`mergeWindows` is used to canonicalize half-open availability windows, but the
current implementation sorts numbers incorrectly, does not merge touching
windows, and mutates caller-owned data.

Update `src/merge-windows.js` so that it:

- accepts an array of `[startMinute, endMinute]` pairs;
- rejects invalid input with a `TypeError` whose message is exactly
  `windows must contain [start, end] pairs of finite numbers where start < end`;
- sorts by numeric start minute and then numeric end minute;
- merges overlapping or touching windows; and
- never mutates the input array or any input tuple.

Do not add runtime dependencies. Keep the exported function name and module
format unchanged. `npm test` is the visible suite. Additional evaluator tests
exercise the full contract.
