import type { Database } from "@schedule-app/api";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createPersonalBlock,
  deletePersonalBlock,
  type PersonalBlockDraft,
} from "../availability/personalBlocks";
import { createWorkspaceRequestGuard } from "../workspace/workspaceRequestGuard";
import {
  type CalendarDateRange,
  type CalendarView,
  getCalendarDateRange,
  getTodayCalendarDate,
  isCalendarDate,
  moveCalendarDate,
} from "./calendar";
import { type CalendarData, listCalendarData } from "./calendarData";

type UseCalendarDataParams = {
  readonly client: SupabaseClient<Database> | null;
  readonly initialDate?: string;
  readonly initialView?: CalendarView;
  readonly timezone: string;
  readonly workspaceId: string;
};

export type CalendarDataController = CalendarData & {
  readonly error: string | null;
  readonly goToNext: () => void;
  readonly goToPrevious: () => void;
  readonly goToToday: () => void;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly range: CalendarDateRange;
  readonly reload: () => Promise<void>;
  readonly removeBlock: (blockId: string) => Promise<void>;
  readonly saveBlock: (draft: PersonalBlockDraft) => Promise<void>;
  readonly selectedDate: string;
  readonly setSelectedDate: (date: string) => void;
  readonly setView: (view: CalendarView) => void;
  readonly view: CalendarView;
};

export function useCalendarData({
  client,
  initialDate,
  initialView = "day",
  timezone,
  workspaceId,
}: UseCalendarDataParams): CalendarDataController {
  const [selectedDate, setSelectedDateState] = useState(
    () => initialDate ?? getTodayCalendarDate(timezone),
  );
  const [view, setViewState] = useState<CalendarView>(initialView);
  const [data, setData] = useState<CalendarData>({
    appointments: [],
    blocks: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(client));
  const [isSaving, setIsSaving] = useState(false);
  const [requestGuard] = useState(createWorkspaceRequestGuard);
  const [operationGuard] = useState(createWorkspaceRequestGuard);
  const range = useMemo(
    () => getCalendarDateRange(selectedDate, view),
    [selectedDate, view],
  );

  const reload = useCallback(async () => {
    const requestId = requestGuard.begin();

    if (!client) {
      if (requestGuard.isCurrent(requestId)) {
        setData({ appointments: [], blocks: [] });
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const nextData = await listCalendarData(client, workspaceId, range);
      if (requestGuard.isCurrent(requestId)) setData(nextData);
    } catch (loadError) {
      if (requestGuard.isCurrent(requestId)) {
        setError(loadError instanceof Error ? loadError.message : "unknown");
      }
    } finally {
      if (requestGuard.isCurrent(requestId)) setIsLoading(false);
    }
  }, [client, range, requestGuard, workspaceId]);

  useEffect(() => {
    void reload();
    return () => {
      requestGuard.invalidate(requestGuard.begin());
      operationGuard.invalidate(operationGuard.begin());
    };
  }, [operationGuard, reload, requestGuard]);

  const saveBlock = useCallback(
    async (draft: PersonalBlockDraft) => {
      if (!client) return;
      const requestId = operationGuard.begin();
      setIsSaving(true);
      setError(null);
      try {
        await createPersonalBlock(client, workspaceId, draft);
        await reload();
      } catch (saveError) {
        if (operationGuard.isCurrent(requestId)) {
          setError(saveError instanceof Error ? saveError.message : "unknown");
        }
        throw saveError;
      } finally {
        if (operationGuard.isCurrent(requestId)) setIsSaving(false);
      }
    },
    [client, operationGuard, reload, workspaceId],
  );

  const removeBlock = useCallback(
    async (blockId: string) => {
      if (!client) return;
      const requestId = operationGuard.begin();
      setIsSaving(true);
      setError(null);
      try {
        await deletePersonalBlock(client, workspaceId, blockId);
        await reload();
      } catch (deleteError) {
        if (operationGuard.isCurrent(requestId)) {
          setError(
            deleteError instanceof Error ? deleteError.message : "unknown",
          );
        }
        throw deleteError;
      } finally {
        if (operationGuard.isCurrent(requestId)) setIsSaving(false);
      }
    },
    [client, operationGuard, reload, workspaceId],
  );

  const goToPrevious = useCallback(() => {
    setSelectedDateState((current) => moveCalendarDate(current, view, -1));
  }, [view]);
  const goToNext = useCallback(() => {
    setSelectedDateState((current) => moveCalendarDate(current, view, 1));
  }, [view]);
  const goToToday = useCallback(() => {
    setSelectedDateState(getTodayCalendarDate(timezone));
  }, [timezone]);
  const setSelectedDate = useCallback((date: string) => {
    if (isCalendarDate(date)) setSelectedDateState(date);
  }, []);
  const setView = useCallback((nextView: CalendarView) => {
    setViewState(nextView);
  }, []);

  return {
    ...data,
    error,
    goToNext,
    goToPrevious,
    goToToday,
    isLoading,
    isSaving,
    range,
    reload,
    removeBlock,
    saveBlock,
    selectedDate,
    setSelectedDate,
    setView,
    view,
  };
}

export function getCalendarDateLabel(
  selectedDate: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    weekday: "long",
  }).format(new Date(`${selectedDate}T12:00:00.000Z`));
}

export function getCalendarDayCount(range: CalendarDateRange): number {
  const from = new Date(`${range.fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${range.toDate}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000) + 1;
}
