import { addCalendarDays, type CalendarDateRange } from "./calendar";

type CalendarRangeCacheEntry<Value> = {
  readonly fetchedAt: number;
  readonly range: CalendarDateRange;
  readonly value: Value;
};

type CalendarRangeCacheOptions = {
  readonly capacity: number;
  readonly staleTimeMs: number;
};

type RangeLoader<Value> = (range: CalendarDateRange) => Promise<Value>;
type RangeMerger<Value> = (
  entries: readonly CalendarRangeCacheEntry<Value>[],
  range: CalendarDateRange,
) => Value;

export class CalendarRangeCache<Value> {
  private readonly entries = new Map<string, CalendarRangeCacheEntry<Value>>();
  private readonly inFlight = new Map<string, Promise<Value>>();
  private readonly listeners = new Set<
    (range: CalendarDateRange | undefined) => void
  >();
  private generation = 0;

  constructor(private readonly options: CalendarRangeCacheOptions) {
    if (!Number.isInteger(options.capacity) || options.capacity < 1) {
      throw new Error("Calendar range cache capacity must be positive");
    }
    if (!Number.isFinite(options.staleTimeMs) || options.staleTimeMs < 0) {
      throw new Error("Calendar range cache stale time must be non-negative");
    }
  }

  get(
    range: CalendarDateRange,
    merge: RangeMerger<Value>,
    now = Date.now(),
  ): Value | undefined {
    const entries = this.getFreshEntries(range, now);
    if (
      !isRangeCovered(
        range,
        entries.map((entry) => entry.range),
      )
    ) {
      return undefined;
    }
    return merge(entries, range);
  }

  hasFreshData(range: CalendarDateRange, now = Date.now()): boolean {
    return isRangeCovered(
      range,
      this.getFreshEntries(range, now).map((entry) => entry.range),
    );
  }

  async load(
    range: CalendarDateRange,
    loader: RangeLoader<Value>,
    merge: RangeMerger<Value>,
    now = Date.now(),
  ): Promise<Value> {
    const cached = this.get(range, merge, now);
    if (cached !== undefined) return cached;

    const existingEntries = this.getFreshEntries(range, now);
    const generation = this.generation;
    const missingRanges = getMissingRanges(
      range,
      existingEntries.map((entry) => entry.range),
    );
    const loadedEntries = await Promise.all(
      missingRanges.map(async (missingRange) => ({
        fetchedAt: now,
        range: missingRange,
        value: await this.loadExactRange(missingRange, loader),
      })),
    );
    const mergedEntries = [...existingEntries, ...loadedEntries];
    const value = merge(mergedEntries, range);
    if (generation === this.generation) {
      this.set({ fetchedAt: now, range, value });
    }
    return value;
  }

  invalidate(range?: CalendarDateRange, notifyListeners = true): void {
    this.generation += 1;
    this.inFlight.clear();
    for (const [key, entry] of [...this.entries]) {
      if (!range || rangesOverlap(entry.range, range)) this.entries.delete(key);
    }
    if (notifyListeners) {
      for (const listener of this.listeners) listener(range);
    }
  }

  subscribe(
    listener: (range: CalendarDateRange | undefined) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async loadExactRange(
    range: CalendarDateRange,
    loader: RangeLoader<Value>,
  ): Promise<Value> {
    const key = rangeKey(range);
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const generation = this.generation;
    const request = loader(range).then((value) => {
      if (generation === this.generation) {
        this.set({ fetchedAt: Date.now(), range, value });
      }
      return value;
    });
    this.inFlight.set(key, request);
    try {
      return await request;
    } finally {
      if (this.inFlight.get(key) === request) this.inFlight.delete(key);
    }
  }

  private getFreshEntries(
    range: CalendarDateRange,
    now: number,
  ): CalendarRangeCacheEntry<Value>[] {
    const fresh: CalendarRangeCacheEntry<Value>[] = [];
    for (const [key, entry] of [...this.entries]) {
      if (now - entry.fetchedAt > this.options.staleTimeMs) {
        this.entries.delete(key);
        continue;
      }
      if (!rangesOverlap(entry.range, range)) continue;
      this.entries.delete(key);
      this.entries.set(key, entry);
      fresh.push(entry);
    }
    return fresh.sort((left, right) =>
      left.range.fromDate.localeCompare(right.range.fromDate),
    );
  }

  private set(entry: CalendarRangeCacheEntry<Value>): void {
    const key = rangeKey(entry.range);
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.options.capacity) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) return;
      this.entries.delete(oldest);
    }
  }
}

function getMissingRanges(
  target: CalendarDateRange,
  coveredRanges: readonly CalendarDateRange[],
): CalendarDateRange[] {
  const overlaps = coveredRanges
    .filter((range) => rangesOverlap(range, target))
    .map((range) => ({
      fromDate:
        range.fromDate < target.fromDate ? target.fromDate : range.fromDate,
      toDate: range.toDate > target.toDate ? target.toDate : range.toDate,
    }))
    .sort((left, right) => left.fromDate.localeCompare(right.fromDate));
  const missing: CalendarDateRange[] = [];
  let nextDate = target.fromDate;

  for (const range of overlaps) {
    if (range.fromDate > nextDate) {
      missing.push({
        fromDate: nextDate,
        toDate: addCalendarDays(range.fromDate, -1),
      });
    }
    if (range.toDate >= nextDate) nextDate = addCalendarDays(range.toDate, 1);
    if (nextDate > target.toDate) return missing;
  }

  if (nextDate <= target.toDate) {
    missing.push({ fromDate: nextDate, toDate: target.toDate });
  }
  return missing;
}

function isRangeCovered(
  target: CalendarDateRange,
  ranges: readonly CalendarDateRange[],
): boolean {
  return getMissingRanges(target, ranges).length === 0;
}

function rangesOverlap(
  left: CalendarDateRange,
  right: CalendarDateRange,
): boolean {
  return left.fromDate <= right.toDate && right.fromDate <= left.toDate;
}

function rangeKey(range: CalendarDateRange): string {
  return `${range.fromDate}:${range.toDate}`;
}
