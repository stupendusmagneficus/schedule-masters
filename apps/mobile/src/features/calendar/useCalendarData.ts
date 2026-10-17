import type { Database } from "@schedule-app/api";
import {
  formatAccessibleDate,
  formatCompactDate,
  formatCompactDateRange,
  type SupportedLocale,
} from "@schedule-app/i18n";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  type AvailabilityOverrideDraft,
  clearAvailabilityDateOverride,
  saveAvailabilityDateOverride,
  saveAvailabilityDateOverrides,
} from "../availability/dateOverrides";
import {
  createPersonalBlock,
  deletePersonalBlock,
  type PersonalBlockDraft,
  updatePersonalBlock,
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
import type { CalendarData } from "./calendarData";
import {
  getCachedCalendarData,
  hasCachedCalendarData,
  invalidateCalendarDataCache,
  loadCachedCalendarData,
} from "./calendarDataCache";

type UseCalendarDataParams = {
  readonly client: SupabaseClient<Database> | null;
  readonly initialDate?: string;
  readonly initialView?: CalendarView;
  readonly timezone: string;
  readonly workspaceId: string;
};

function invokeLatestReload(ref: { readonly current: () => Promise<void> }) {
  void ref.current();
}

export type CalendarDataController = CalendarData & {
  readonly error: string | null;
  readonly goToNext: () => void;
  readonly goToPrevious: () => void;
  readonly goToToday: () => void;
  readonly goToTodayDay: () => void;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly range: CalendarDateRange;
  readonly reload: () => Promise<void>;
  readonly removeBlock: (blockId: string) => Promise<void>;
  readonly saveBlock: (draft: PersonalBlockDraft) => Promise<void>;
  readonly saveDateOverride: (
    draft: AvailabilityOverrideDraft,
  ) => Promise<void>;
  readonly saveDateOverrides: (
    drafts: readonly AvailabilityOverrideDraft[],
  ) => Promise<void>;
  readonly clearDateOverride: (date: string) => Promise<void>;
  readonly updateBlock: (
    blockId: string,
    draft: PersonalBlockDraft,
  ) => Promise<void>;
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
    dateOverrides: [],
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

  const loadCurrentRange = useCallback(
    async (refresh = false) => {
      const requestId = requestGuard.begin();

      if (refresh && client) {
        invalidateCalendarDataCache(client, workspaceId);
      }

      if (view === "month") {
        if (requestGuard.isCurrent(requestId)) {
          setError(null);
          setIsLoading(false);
        }
        return;
      }

      if (!client) {
        if (requestGuard.isCurrent(requestId)) {
          setData({ appointments: [], blocks: [], dateOverrides: [] });
          setIsLoading(false);
        }
        return;
      }

      const cachedData = getCachedCalendarData(
        client,
        workspaceId,
        timezone,
        range,
      );
      if (cachedData) {
        if (requestGuard.isCurrent(requestId)) {
          setData(cachedData);
          setError(null);
          setIsLoading(false);
        }
        return;
      }

      setData({ appointments: [], blocks: [], dateOverrides: [] });
      setIsLoading(true);
      setError(null);
      try {
        const nextData = await loadCachedCalendarData(
          client,
          workspaceId,
          timezone,
          range,
        );
        if (requestGuard.isCurrent(requestId)) setData(nextData);
      } catch (loadError) {
        if (requestGuard.isCurrent(requestId)) {
          setError(loadError instanceof Error ? loadError.message : "unknown");
        }
      } finally {
        if (requestGuard.isCurrent(requestId)) setIsLoading(false);
      }
    },
    [client, range, requestGuard, timezone, view, workspaceId],
  );

  const reload = useCallback(() => loadCurrentRange(true), [loadCurrentRange]);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useEffect(() => {
    void loadCurrentRange();
    return () => {
      requestGuard.invalidate(requestGuard.begin());
      operationGuard.invalidate(operationGuard.begin());
    };
  }, [loadCurrentRange, operationGuard, requestGuard]);

  useEffect(() => {
    if (!client) return;
    const channel = client
      .channel(`master-calendar-data:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          filter: `workspace_id=eq.${workspaceId}`,
          schema: "public",
          table: "appointments",
        },
        () => invokeLatestReload(reloadRef),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [client, workspaceId]);

  useEffect(() => {
    if (!client) return;
    let reloadTimeout: ReturnType<typeof setTimeout> | null = null;
    const { data: authSubscription } = client.auth.onAuthStateChange(
      (event) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
        invalidateCalendarDataCache(client, workspaceId, undefined, false);
        setData({ appointments: [], blocks: [], dateOverrides: [] });
        if (event === "SIGNED_IN") {
          reloadTimeout = setTimeout(() => invokeLatestReload(reloadRef), 0);
        } else {
          setIsLoading(false);
        }
      },
    );
    return () => {
      if (reloadTimeout) clearTimeout(reloadTimeout);
      authSubscription.subscription.unsubscribe();
    };
  }, [client, workspaceId]);

  useEffect(() => {
    if (!client) return;
    let wasActive = AppState.currentState === "active";
    const subscription = AppState.addEventListener("change", (nextState) => {
      const resumed = nextState === "active" && !wasActive;
      wasActive = nextState === "active";
      if (resumed) invokeLatestReload(reloadRef);
    });
    return () => subscription.remove();
  }, [client]);

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

  const updateBlock = useCallback(
    async (blockId: string, draft: PersonalBlockDraft) => {
      if (!client) return;
      const requestId = operationGuard.begin();
      setIsSaving(true);
      setError(null);
      try {
        await updatePersonalBlock(client, workspaceId, blockId, draft);
        await reload();
      } catch (updateError) {
        if (operationGuard.isCurrent(requestId)) {
          setError(
            updateError instanceof Error ? updateError.message : "unknown",
          );
        }
        throw updateError;
      } finally {
        if (operationGuard.isCurrent(requestId)) setIsSaving(false);
      }
    },
    [client, operationGuard, reload, workspaceId],
  );

  const saveDateOverride = useCallback(
    async (draft: AvailabilityOverrideDraft) => {
      if (!client) return;
      const requestId = operationGuard.begin();
      setIsSaving(true);
      setError(null);
      try {
        await saveAvailabilityDateOverride(client, workspaceId, draft);
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

  const saveDateOverrides = useCallback(
    async (drafts: readonly AvailabilityOverrideDraft[]) => {
      if (!client) return;
      const requestId = operationGuard.begin();
      setIsSaving(true);
      setError(null);
      try {
        await saveAvailabilityDateOverrides(client, workspaceId, drafts);
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

  const clearDateOverride = useCallback(
    async (date: string) => {
      if (!client) return;
      const requestId = operationGuard.begin();
      setIsSaving(true);
      setError(null);
      try {
        await clearAvailabilityDateOverride(client, workspaceId, date);
        await reload();
      } catch (clearError) {
        if (operationGuard.isCurrent(requestId)) {
          setError(
            clearError instanceof Error ? clearError.message : "unknown",
          );
        }
        throw clearError;
      } finally {
        if (operationGuard.isCurrent(requestId)) setIsSaving(false);
      }
    },
    [client, operationGuard, reload, workspaceId],
  );

  const goToPrevious = useCallback(() => {
    const nextDate = moveCalendarDate(selectedDate, view, -1);
    setIsLoading(
      Boolean(
        client &&
          view !== "month" &&
          !hasCachedCalendarData(
            client,
            workspaceId,
            timezone,
            getCalendarDateRange(nextDate, view),
          ),
      ),
    );
    setSelectedDateState(nextDate);
  }, [client, selectedDate, timezone, view, workspaceId]);
  const goToNext = useCallback(() => {
    const nextDate = moveCalendarDate(selectedDate, view, 1);
    setIsLoading(
      Boolean(
        client &&
          view !== "month" &&
          !hasCachedCalendarData(
            client,
            workspaceId,
            timezone,
            getCalendarDateRange(nextDate, view),
          ),
      ),
    );
    setSelectedDateState(nextDate);
  }, [client, selectedDate, timezone, view, workspaceId]);
  const goToToday = useCallback(() => {
    const today = getTodayCalendarDate(timezone);
    setIsLoading(
      Boolean(
        client &&
          view !== "month" &&
          !hasCachedCalendarData(
            client,
            workspaceId,
            timezone,
            getCalendarDateRange(today, view),
          ),
      ),
    );
    setSelectedDateState(today);
  }, [client, timezone, view, workspaceId]);
  const goToTodayDay = useCallback(() => {
    const today = getTodayCalendarDate(timezone);
    setIsLoading(
      Boolean(
        client &&
          !hasCachedCalendarData(
            client,
            workspaceId,
            timezone,
            getCalendarDateRange(today, "day"),
          ),
      ),
    );
    setViewState("day");
    setSelectedDateState(today);
  }, [client, timezone, workspaceId]);
  const setSelectedDate = useCallback(
    (date: string) => {
      if (!isCalendarDate(date)) return;
      if (client && date !== selectedDate && view !== "month") {
        setIsLoading(
          !hasCachedCalendarData(
            client,
            workspaceId,
            timezone,
            getCalendarDateRange(date, view),
          ),
        );
      }
      setSelectedDateState(date);
    },
    [client, selectedDate, timezone, view, workspaceId],
  );
  const setView = useCallback(
    (nextView: CalendarView) => {
      if (client && nextView !== view) {
        setIsLoading(
          nextView !== "month" &&
            !hasCachedCalendarData(
              client,
              workspaceId,
              timezone,
              getCalendarDateRange(selectedDate, nextView),
            ),
        );
      }
      setViewState(nextView);
    },
    [client, selectedDate, timezone, view, workspaceId],
  );

  return {
    ...data,
    error,
    clearDateOverride,
    goToNext,
    goToPrevious,
    goToToday,
    goToTodayDay,
    isLoading,
    isSaving,
    range,
    reload,
    removeBlock,
    saveBlock,
    saveDateOverride,
    saveDateOverrides,
    selectedDate,
    setSelectedDate,
    setView,
    updateBlock,
    view,
  };
}

export function getCalendarDateLabel(
  selectedDate: string,
  locale: SupportedLocale,
  timezone = "Europe/Prague",
): string {
  return formatCompactDate(new Date(`${selectedDate}T12:00:00.000Z`), locale, {
    timeZone: timezone,
  });
}

export function getCalendarWeekLabel(
  selectedDate: string,
  locale: SupportedLocale,
  timezone = "Europe/Prague",
): string {
  const range = getCalendarDateRange(selectedDate, "week");
  return formatCompactDateRange(
    new Date(`${range.fromDate}T12:00:00.000Z`),
    new Date(`${range.toDate}T12:00:00.000Z`),
    locale,
    { timeZone: timezone },
  );
}

export function getAccessibleCalendarLabel(
  selectedDate: string,
  view: "day" | "week",
  locale: SupportedLocale,
  timezone = "Europe/Prague",
): string {
  const range = getCalendarDateRange(selectedDate, view);
  const from = formatAccessibleDate(
    new Date(`${range.fromDate}T12:00:00.000Z`),
    locale,
    timezone,
  );
  if (range.fromDate === range.toDate) return from;
  return `${from} – ${formatAccessibleDate(
    new Date(`${range.toDate}T12:00:00.000Z`),
    locale,
    timezone,
  )}`;
}

export function getCalendarDayCount(range: CalendarDateRange): number {
  const from = new Date(`${range.fromDate}T00:00:00.000Z`).getTime();
  const to = new Date(`${range.toDate}T00:00:00.000Z`).getTime();
  return Math.round((to - from) / 86_400_000) + 1;
}
