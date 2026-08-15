/**
 * Turn a list of half-open availability windows into a canonical schedule.
 *
 * Each window is a two-item tuple: [startMinute, endMinute].
 */
export function mergeWindows(windows) {
  if (windows.length === 0) return [];

  const sorted = windows.sort();
  const merged = [sorted[0]];

  for (const current of sorted.slice(1)) {
    const previous = merged.at(-1);

    if (current[0] < previous[1]) {
      previous[1] = Math.max(previous[1], current[1]);
    } else {
      merged.push(current);
    }
  }

  return merged;
}
