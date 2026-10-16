import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCalendarDateRange } from "./calendar";
import type { CalendarData } from "./calendarData";
import { listCalendarData } from "./calendarData";
import { CalendarMonthCache } from "./calendarMonthCache";
import {
  appendCalendarMonths,
  createInitialMonthWindow,
  getCalendarMonth,
  isMonthRequestCurrent,
  MONTH_WINDOW_PAGE_SIZE,
  prependCalendarMonths,
  shouldResetCalendarMonthWindow,
} from "./monthWindow";

const MONTH_CACHE_SIZE = 13;

export type CalendarMonthEntry = {
  readonly month: string;
  readonly data: CalendarData | null;
  readonly isLoading: boolean;
  readonly hasError: boolean;
};

type UseCalendarMonthWindowParams = {
  readonly client: SupabaseClient<Database> | null;
  readonly enabled: boolean;
  readonly selectedDate: string;
  readonly workspaceId: string;
};

export function useCalendarMonthWindow({
  client,
  enabled,
  selectedDate,
  workspaceId,
}: UseCalendarMonthWindowParams) {
  const selectedMonth = getCalendarMonth(selectedDate);
  const previousSelectedMonth = useRef(selectedMonth);
  const [months, setMonths] = useState(() =>
    createInitialMonthWindow(selectedDate),
  );
  const activeMonths = useRef(months);
  activeMonths.current = months;
  const [entries, setEntries] = useState<Record<string, CalendarMonthEntry>>(
    {},
  );
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const loadingPreviousRef = useRef(false);
  const loadingNextRef = useRef(false);
  const cache = useRef(new CalendarMonthCache<CalendarData>(MONTH_CACHE_SIZE));
  const inFlight = useRef(new Map<string, Promise<CalendarData>>());
  const requestGeneration = useRef(0);
  const isMounted = useRef(true);
  const scope = useRef<{
    client: SupabaseClient<Database> | null;
    workspaceId: string;
  } | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      requestGeneration.current += 1;
    };
  }, []);

  useEffect(() => {
    if (
      scope.current?.client === client &&
      scope.current.workspaceId === workspaceId
    ) {
      return;
    }
    scope.current = { client, workspaceId };
    requestGeneration.current += 1;
    cache.current.clear();
    inFlight.current.clear();
    setEntries({});
  });

  useEffect(() => {
    if (previousSelectedMonth.current === selectedMonth) return;
    previousSelectedMonth.current = selectedMonth;
    if (shouldResetCalendarMonthWindow(activeMonths.current, selectedMonth)) {
      setMonths(createInitialMonthWindow(`${selectedMonth}-01`));
    }
  }, [selectedMonth]);

  const loadMonth = useCallback(
    async (month: string) => {
      if (!client || !enabled) return;
      const cacheKey = `${workspaceId}:${month}`;
      const cached = cache.current.get(cacheKey);
      if (cached) {
        setEntries((current) => ({
          ...current,
          [month]: { data: cached, hasError: false, isLoading: false, month },
        }));
        return;
      }

      const generation = requestGeneration.current;
      setEntries((current) => ({
        ...current,
        [month]: {
          data: current[month]?.data ?? null,
          hasError: false,
          isLoading: true,
          month,
        },
      }));
      let request = inFlight.current.get(cacheKey);
      if (!request) {
        request = listCalendarData(
          client,
          workspaceId,
          getCalendarDateRange(`${month}-01`, "month"),
        );
        inFlight.current.set(cacheKey, request);
      }

      try {
        const data = await request;
        if (!isMounted.current || requestGeneration.current !== generation)
          return;
        cache.current.set(cacheKey, data);
        if (
          !isMonthRequestCurrent(
            generation,
            requestGeneration.current,
            activeMonths.current,
            month,
          )
        ) {
          return;
        }
        setEntries((current) => ({
          ...current,
          [month]: { data, hasError: false, isLoading: false, month },
        }));
      } catch {
        if (
          isMounted.current &&
          isMonthRequestCurrent(
            generation,
            requestGeneration.current,
            activeMonths.current,
            month,
          )
        ) {
          setEntries((current) => ({
            ...current,
            [month]: {
              data: current[month]?.data ?? null,
              hasError: true,
              isLoading: false,
              month,
            },
          }));
        }
      } finally {
        if (inFlight.current.get(cacheKey) === request) {
          inFlight.current.delete(cacheKey);
        }
      }
    },
    [client, enabled, workspaceId],
  );

  useEffect(() => {
    if (!enabled) return;
    for (const month of months) void loadMonth(month);
  }, [enabled, loadMonth, months]);

  const loadPrevious = useCallback(async () => {
    if (loadingPreviousRef.current || !enabled) return;
    loadingPreviousRef.current = true;
    setIsLoadingPrevious(true);
    const nextMonths = prependCalendarMonths(months);
    setMonths(nextMonths);
    setEntries((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([month]) => nextMonths.includes(month)),
      ),
    );
    await Promise.all(
      nextMonths.slice(0, MONTH_WINDOW_PAGE_SIZE).map(loadMonth),
    );
    loadingPreviousRef.current = false;
    setIsLoadingPrevious(false);
  }, [enabled, loadMonth, months]);

  const loadNext = useCallback(async () => {
    if (loadingNextRef.current || !enabled) return;
    loadingNextRef.current = true;
    setIsLoadingNext(true);
    const nextMonths = appendCalendarMonths(months);
    setMonths(nextMonths);
    setEntries((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([month]) => nextMonths.includes(month)),
      ),
    );
    await Promise.all(nextMonths.slice(-MONTH_WINDOW_PAGE_SIZE).map(loadMonth));
    loadingNextRef.current = false;
    setIsLoadingNext(false);
  }, [enabled, loadMonth, months]);

  const reload = useCallback(async () => {
    for (const month of months) {
      cache.current.delete(`${workspaceId}:${month}`);
      inFlight.current.delete(`${workspaceId}:${month}`);
    }
    await Promise.all(months.map(loadMonth));
  }, [loadMonth, months, workspaceId]);

  const monthEntries = useMemo(
    () =>
      months.map(
        (month) =>
          entries[month] ?? {
            data: null,
            hasError: false,
            isLoading: enabled && Boolean(client),
            month,
          },
      ),
    [client, enabled, entries, months],
  );

  return {
    entries: monthEntries,
    isLoadingNext,
    isLoadingPrevious,
    loadNext,
    loadPrevious,
    reload,
    selectedMonth,
  };
}
