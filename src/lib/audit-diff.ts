/**
 * Computes only the changed fields between old and new values.
 * Returns { oldValue: changed fields from old, newValue: changed fields from new }
 */
export function diffValues(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
): { oldValue: Record<string, unknown>; newValue: Record<string, unknown> } {
  const oldDiff: Record<string, unknown> = {};
  const newDiff: Record<string, unknown> = {};

  for (const key of Object.keys(newData)) {
    const oldVal = String(oldData[key] ?? "");
    const newVal = String(newData[key] ?? "");
    if (oldVal !== newVal) {
      oldDiff[key] = oldData[key];
      newDiff[key] = newData[key];
    }
  }

  return { oldValue: oldDiff, newValue: newDiff };
}
