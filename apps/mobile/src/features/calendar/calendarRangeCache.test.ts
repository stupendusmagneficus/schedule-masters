import { describe, expect, it, vi } from "vitest";
import { addCalendarDays, type CalendarDateRange } from "./calendar";
import { CalendarRangeCache } from "./calendarRangeCache";

const cacheOptions = { capacity: 8, staleTimeMs: 1_000 };

function dates(range: CalendarDateRange): string[] {
  const result: string[] = [];
  for (let date = range.fromDate; date <= range.toDate; ) {
    result.push(date);
    date = addCalendarDays(date, 1);
  }
  return result;
}

function mergeRanges(
  entries: readonly { range: CalendarDateRange; value: string[] }[],
  range: CalendarDateRange,
): string[] {
  return [...new Set(entries.flatMap((entry) => entry.value))]
    .filter((date) => date >= range.fromDate && date <= range.toDate)
    .sort();
}

describe("CalendarRangeCache", () => {
  it("loads only missing date segments when a larger range overlaps cached data", async () => {
    const cache = new CalendarRangeCache<string[]>(cacheOptions);
    const load = vi.fn(async (range: CalendarDateRange) => dates(range));
    const merge = mergeRanges;

    await cache.load(
      { fromDate: "2026-10-14", toDate: "2026-10-14" },
      load,
      merge,
      10,
    );
    const week = await cache.load(
      { fromDate: "2026-10-12", toDate: "2026-10-18" },
      load,
      merge,
      20,
    );

    expect(load.mock.calls.map(([range]) => range)).toEqual([
      { fromDate: "2026-10-14", toDate: "2026-10-14" },
      { fromDate: "2026-10-12", toDate: "2026-10-13" },
      { fromDate: "2026-10-15", toDate: "2026-10-18" },
    ]);
    expect(week).toEqual(
      dates({ fromDate: "2026-10-12", toDate: "2026-10-18" }),
    );
  });

  it("returns a fresh containing range without another request", async () => {
    const cache = new CalendarRangeCache<string[]>(cacheOptions);
    const load = vi.fn(async (range: CalendarDateRange) => dates(range));

    await cache.load(
      { fromDate: "2026-10-12", toDate: "2026-10-18" },
      load,
      mergeRanges,
      10,
    );
    const day = await cache.load(
      { fromDate: "2026-10-14", toDate: "2026-10-14" },
      load,
      mergeRanges,
      20,
    );

    expect(load).toHaveBeenCalledTimes(1);
    expect(day).toEqual(["2026-10-14"]);
  });

  it("joins identical in-flight range requests", async () => {
    const cache = new CalendarRangeCache<string[]>(cacheOptions);
    let finishLoad: ((value: string[]) => void) | undefined;
    const load = vi.fn(
      () =>
        new Promise<string[]>((resolve) => {
          finishLoad = resolve;
        }),
    );
    const range = { fromDate: "2026-10-14", toDate: "2026-10-14" };
    const first = cache.load(range, load, mergeRanges, 10);
    const second = cache.load(range, load, mergeRanges, 10);

    finishLoad?.(["2026-10-14"]);
    await expect(Promise.all([first, second])).resolves.toEqual([
      ["2026-10-14"],
      ["2026-10-14"],
    ]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not reuse a request started before invalidation", async () => {
    const cache = new CalendarRangeCache<string[]>(cacheOptions);
    const resolvers: Array<(value: string[]) => void> = [];
    const load = vi.fn(
      () =>
        new Promise<string[]>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const range = { fromDate: "2026-10-14", toDate: "2026-10-14" };
    const staleRequest = cache.load(range, load, mergeRanges, 10);
    cache.invalidate(range);
    const freshRequest = cache.load(range, load, mergeRanges, 20);

    expect(load).toHaveBeenCalledTimes(2);
    resolvers[0]?.(["old"]);
    resolvers[1]?.(["2026-10-14"]);
    await Promise.all([staleRequest, freshRequest]);
    expect(cache.get(range, mergeRanges, 21)).toEqual(["2026-10-14"]);
  });

  it("refreshes stale ranges and invalidates matching cached ranges", async () => {
    const cache = new CalendarRangeCache<string[]>(cacheOptions);
    const load = vi.fn(async (range: CalendarDateRange) => dates(range));
    const listener = vi.fn();
    cache.subscribe(listener);
    const range = { fromDate: "2026-10-14", toDate: "2026-10-14" };

    await cache.load(range, load, mergeRanges, 10);
    await cache.load(range, load, mergeRanges, 1_011);
    cache.invalidate(range);
    await cache.load(range, load, mergeRanges, 1_012);

    expect(load).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenCalledWith(range);
  });
});
