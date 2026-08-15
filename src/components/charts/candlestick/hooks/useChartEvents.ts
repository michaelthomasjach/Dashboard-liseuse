import { useEffect, useMemo, useState } from "react";
import type { ChartEvent } from "../interfaces/ChartEvent.interface";
import { defaultEventColor } from "../eventsCatalog";

export interface UseChartEventsArgs {
  events: ChartEvent[] | undefined;
  indexForDate: (d: Date) => number;
  visibleRange: { start: number; end: number };
  dataLength: number;
}

/** Event markers (see `CandlestickChartProps.events`) — per-kind show/hide, the master
 *  eventsVisible toggle, which marker's stack popover/modal is currently open, and the derived
 *  eventKinds/visibleEvents/eventStacks the markers and their tooltip actually render from. */
export function useChartEvents({ events, indexForDate, visibleRange, dataLength }: UseChartEventsArgs) {
  const [hiddenEventKinds, setHiddenEventKinds] = useState<Set<string>>(new Set());
  // Master on/off for every event marker at once, independent of (and layered on top of)
  // `hiddenEventKinds`'s own per-kind granularity — a toolbar-level "hide everything quickly"
  // rather than opening the settings modal to uncheck every kind one by one.
  const [eventsVisible, setEventsVisible] = useState(true);
  // The candle index ("i") of the currently open event stack's popover/modal, plus a frozen
  // snapshot of its events — frozen so panning the marker out of the nearby-visible window (see
  // `visibleEvents`'s own start/end buffer) doesn't empty an already-open modal out from under
  // the user. The popover's own *position* still tracks the live index every render (its
  // left/bottom are computed from `activeEventStack.i`, not stored), so it stays anchored to the
  // marker as the chart pans/zooms.
  const [activeEventStack, setActiveEventStack] = useState<{ i: number; events: ChartEvent[] } | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);

  // First-seen order (not alphabetical) so the settings modal's checkbox list matches whatever
  // order the caller's own `events` array introduces each kind in.
  const eventKinds = useMemo(() => {
    const kinds: string[] = [];
    for (const e of events ?? []) if (!kinds.includes(e.kind)) kinds.push(e.kind);
    return kinds;
  }, [events]);

  const visibleEvents = useMemo(() => {
    if (!events || events.length === 0 || !eventsVisible) return [];
    const start = Math.max(0, visibleRange.start - 2);
    const end = Math.min(dataLength, visibleRange.end + 2);
    return events
      .map((event, idx) => ({ event, idx, i: indexForDate(event.date) }))
      .filter(({ event, i }) => !hiddenEventKinds.has(event.kind) && i >= start && i <= end);
  }, [events, eventsVisible, hiddenEventKinds, visibleRange, dataLength, indexForDate]);

  // Toggling all events off should also close whatever's currently anchored to a now-invisible
  // marker, same as it disappearing would from panning it out of view (see `activeEventStack`'s
  // own doc comment) — otherwise the tooltip/modal would keep showing content for a marker
  // that's no longer there to point at.
  useEffect(() => {
    if (eventsVisible) return;
    setActiveEventStack(null);
    setEventModalOpen(false);
  }, [eventsVisible]);

  // Events sharing the same candle index render as a single "stack" marker instead of fully
  // overlapping circles — grouped from `visibleEvents` (not `events` directly) so this stays
  // scoped to whatever's currently near the visible window, same as the markers themselves.
  const eventStacks = useMemo(() => {
    const map = new Map<number, ChartEvent[]>();
    for (const { event, i } of visibleEvents) {
      const bucket = map.get(i);
      if (bucket) bucket.push(event);
      else map.set(i, [event]);
    }
    return Array.from(map.entries()).map(([i, stackEvents]) => ({
      i,
      // Every event's `color` is resolved here (once), not left for the marker/tooltip to each
      // fall back on separately — both then just read `event.color` directly and always agree.
      events: stackEvents.map((event) => {
        const kindIndex = eventKinds.indexOf(event.kind);
        return { ...event, color: event.color ?? defaultEventColor(kindIndex < 0 ? 0 : kindIndex) };
      }),
    }));
  }, [visibleEvents, eventKinds]);

  return {
    hiddenEventKinds,
    setHiddenEventKinds,
    eventsVisible,
    setEventsVisible,
    activeEventStack,
    setActiveEventStack,
    eventModalOpen,
    setEventModalOpen,
    eventKinds,
    visibleEvents,
    eventStacks,
  };
}
