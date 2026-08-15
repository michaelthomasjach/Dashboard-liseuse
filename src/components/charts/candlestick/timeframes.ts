import type { TimeframeEntry } from "./interfaces/TimeframeEntry.interface";
import type { TimeframeGroup } from "./interfaces/TimeframeGroup.interface";

export function isTimeframeGroup(entry: TimeframeEntry): entry is TimeframeGroup {
  return "options" in entry;
}

export function findTimeframeLabel(entries: TimeframeEntry[] | undefined, value: string | undefined): string | null {
  if (!entries || !value) return null;
  for (const entry of entries) {
    if (isTimeframeGroup(entry)) {
      const found = entry.options.find((o) => o.value === value);
      if (found) return found.label;
    } else if (entry.value === value) {
      return entry.label;
    }
  }
  return null;
}
