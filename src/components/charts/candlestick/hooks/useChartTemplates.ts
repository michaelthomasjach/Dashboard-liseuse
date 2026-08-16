import { useRef, useState } from "react";
import type { Indicator } from "../interfaces/Indicator.interface";
import type { ChartTemplate, ChartTemplateSnapshot } from "../interfaces/ChartTemplate.interface";

export interface UseChartTemplatesArgs {
  defaultTemplates: ChartTemplate[] | undefined;
  onTemplatesChange: ((templates: ChartTemplate[]) => void) | undefined;
  indicators: Indicator[];
  volumePaneOrder: number;
  volumePaneState: "expanded" | "collapsed" | "hidden";
  paneHeightFractions: Record<string, number>;
  loadIndicatorLayout: (snapshot: ChartTemplateSnapshot) => void;
}

// A plain, deterministic serialization of a snapshot's own fields (not the whole object as-is —
// key order in `paneHeightFractions` can legitimately differ between two snapshots that are
// otherwise identical, e.g. after an indicator was removed and re-added, which would otherwise
// read as "dirty" for no real reason) — used to compare "current" against "the active template's
// own saved snapshot" without pulling in a general-purpose deep-equal dependency for this one spot.
function serializeSnapshot(s: ChartTemplateSnapshot): string {
  const sortedPaneHeights = Object.fromEntries(Object.entries(s.paneHeightFractions).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify({ indicators: s.indicators, volumePaneOrder: s.volumePaneOrder, volumePaneState: s.volumePaneState, paneHeightFractions: sortedPaneHeights });
}

/** Named, savable/loadable snapshots of the chart's own indicator/pane layout (see the Save
 *  button + templates dropdown in the header) — CRUD'd the same uncontrolled-collection-plus-
 *  callback way as `drawings`/`indicators`/`favoriteSymbolIds` elsewhere in this file: seeded
 *  once from `defaultTemplates`, every change reported back via `onTemplatesChange`. */
export function useChartTemplates({
  defaultTemplates,
  onTemplatesChange,
  indicators,
  volumePaneOrder,
  volumePaneState,
  paneHeightFractions,
  loadIndicatorLayout,
}: UseChartTemplatesArgs) {
  const [templates, setTemplates] = useState<ChartTemplate[]>(defaultTemplates ?? []);
  // Which template the chart currently reflects — null until the first save/load. Purely local:
  // nothing asked for the app to control or persist *which one* is active, only the list itself.
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const templateIdRef = useRef(0);

  function commitTemplates(next: ChartTemplate[]) {
    setTemplates(next);
    onTemplatesChange?.(next);
  }

  function currentSnapshot(): ChartTemplateSnapshot {
    return { indicators, volumePaneOrder, volumePaneState, paneHeightFractions };
  }

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? null;
  // No template active yet: "dirty" means there's actually something on the chart that a switch
  // would silently discard, not literally "always dirty" (a blank chart has nothing to lose).
  // Template active: dirty means the live layout has drifted from what was last saved under it.
  const isDirty = activeTemplate ? serializeSnapshot(currentSnapshot()) !== serializeSnapshot(activeTemplate) : indicators.length > 0;

  function createTemplate(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `template-${templateIdRef.current++}`;
    commitTemplates([...templates, { id, name: trimmed, ...currentSnapshot() }]);
    setActiveTemplateId(id);
  }

  /** No active template: creates a new one named `name` and makes it active — `name` is
   *  required here (the caller collects it via the "name this template" modal first). Active
   *  template already set: overwrites its own snapshot in place, `name` ignored — this is the
   *  "click Save again just re-saves, no modal" half of the feature. */
  function saveTemplate(name?: string) {
    if (activeTemplate) {
      commitTemplates(templates.map((t) => (t.id === activeTemplate.id ? { ...t, ...currentSnapshot() } : t)));
      return;
    }
    if (name) createTemplate(name);
  }

  /** "Enregistrer sous" — always creates a brand new template from the current layout and makes
   *  it active, even with one already active (unlike `saveTemplate`, which overwrites that one
   *  instead). The header's own small "+" next to Save is the only entry point for this. */
  function saveTemplateAs(name: string) {
    createTemplate(name);
  }

  function loadTemplate(id: string) {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    loadIndicatorLayout(template);
    setActiveTemplateId(id);
  }

  function deleteTemplate(id: string) {
    commitTemplates(templates.filter((t) => t.id !== id));
    if (activeTemplateId === id) setActiveTemplateId(null);
  }

  return { templates, activeTemplateId, activeTemplate, isDirty, saveTemplate, saveTemplateAs, loadTemplate, deleteTemplate };
}
