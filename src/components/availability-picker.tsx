"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { fetchAvailability, type AvailabilitySlot } from "@/lib/booking-api";
import { addDays, formatDay, formatLondonTime, londonTimeInput, londonToday, startOfWeek } from "@/lib/date-format";
import { LoadingRegion, Skeleton } from "@/components/ui/loading";

type DayState = AvailabilitySlot[] | "error";

/** How far ahead to look for the first free time before giving up. */
const SEARCH_WEEKS = 8;
/** How far ahead customers can browse week by week. */
const MAX_WEEKS = 26;
/** Re-check the visible week this often while the page is open, so times taken by other customers disappear. */
const REFRESH_MS = 60_000;

const periods = [
  { label: "Morning", test: (hour: number) => hour < 12 },
  { label: "Afternoon", test: (hour: number) => hour >= 12 && hour < 17 },
  { label: "Evening", test: (hour: number) => hour >= 17 },
];

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d={direction === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

function weekDays(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function weekLabel(weekStart: string) {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.slice(5, 7) === end.slice(5, 7);
  return sameMonth
    ? `${formatDay(weekStart, { day: "numeric" })} – ${formatDay(end, { day: "numeric", month: "long" })}`
    : `${formatDay(weekStart, { day: "numeric", month: "short" })} – ${formatDay(end, { day: "numeric", month: "short" })}`;
}

/**
 * Week-at-a-glance availability: shows which days have free times, jumps to the first
 * available day, and lists that day's times grouped by part of the day.
 */
export function AvailabilityPicker({
  treatmentId,
  selectedDate,
  selectedSlot,
  onSelect,
}: {
  treatmentId: string;
  selectedDate: string;
  selectedSlot: AvailabilitySlot | null;
  onSelect: (date: string, slot: AvailabilitySlot | null) => void;
}) {
  const today = londonToday();
  const firstWeek = startOfWeek(today);
  const lastWeek = addDays(firstWeek, 7 * (MAX_WEEKS - 1));
  const [weekStart, setWeekStart] = useState(selectedDate ? startOfWeek(selectedDate) : firstWeek);
  const [days, setDays] = useState<Record<string, DayState>>({});
  const [searching, setSearching] = useState(!selectedDate);
  const [nothingFound, setNothingFound] = useState(false);
  const [takenNotice, setTakenNotice] = useState(false);
  const requests = useRef(new Map<string, Promise<DayState>>());
  const visibleWeek = useRef(weekStart);
  // Searches can outlive the picker (e.g. going back a step); don't let them change the selection then.
  const alive = useRef(false);

  function loadDay(day: string) {
    let pending = requests.current.get(day);
    if (!pending) {
      pending = fetchAvailability(treatmentId, day)
        .then((response): DayState => response.slots)
        .catch((): DayState => "error")
        .then((result) => {
          if (result === "error") requests.current.delete(day);
          setDays((current) => ({ ...current, [day]: result }));
          return result;
        });
      requests.current.set(day, pending);
    }
    return pending;
  }

  function loadWeek(week: string) {
    return Promise.all(weekDays(week).filter((day) => day >= today).map(async (day) => [day, await loadDay(day)] as const));
  }

  function firstAvailable(results: (readonly [string, DayState])[]) {
    return results.find(([, result]) => Array.isArray(result) && result.length > 0)?.[0];
  }

  /** Walks forward week by week until a free time turns up. */
  async function findFrom(week: string) {
    for (let offset = 0; offset < SEARCH_WEEKS; offset += 1) {
      const candidate = addDays(week, 7 * offset);
      if (candidate > lastWeek) break;
      const day = firstAvailable(await loadWeek(candidate));
      if (!alive.current) return;
      if (day) {
        visibleWeek.current = candidate;
        setWeekStart(candidate);
        setSearching(false);
        onSelect(day, null);
        return;
      }
    }
    setSearching(false);
    setNothingFound(true);
  }

  const start = useEffectEvent(() => {
    if (selectedDate) void loadWeek(weekStart);
    else void findFrom(firstWeek);
  });

  useEffect(() => {
    alive.current = true;
    const task = window.setTimeout(start, 0);
    return () => {
      alive.current = false;
      window.clearTimeout(task);
    };
  }, []);

  const refresh = useEffectEvent(async () => {
    if (searching || document.visibilityState !== "visible") return;
    const week = visibleWeek.current;
    for (const day of weekDays(week)) requests.current.delete(day);
    const results = await loadWeek(week);
    if (!alive.current || !selectedSlot) return;
    const latest = results.find(([day]) => day === selectedDate)?.[1];
    if (Array.isArray(latest) && !latest.some((slot) => slot.starts_at === selectedSlot.starts_at)) {
      setTakenNotice(true);
      onSelect(selectedDate, null);
    }
  });

  useEffect(() => {
    const onVisible = () => void refresh();
    const timer = window.setInterval(onVisible, REFRESH_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  function select(date: string, slot: AvailabilitySlot | null) {
    setTakenNotice(false);
    onSelect(date, slot);
  }

  async function showWeek(week: string) {
    visibleWeek.current = week;
    setWeekStart(week);
    setNothingFound(false);
    const results = await loadWeek(week);
    if (!alive.current) return;
    // Only move the selection if the customer is still looking at this week.
    if (visibleWeek.current !== week || weekDays(week).includes(selectedDate)) return;
    const day = firstAvailable(results);
    if (day) onSelect(day, null);
  }

  function retry() {
    for (const day of weekDays(weekStart)) {
      if (days[day] === "error") requests.current.delete(day);
    }
    void loadWeek(weekStart);
  }

  const visibleDays = weekDays(weekStart);
  const weekLoaded = visibleDays.filter((day) => day >= today).every((day) => days[day] !== undefined);
  const weekEmpty = weekLoaded && visibleDays.every((day) => !Array.isArray(days[day]) || !(days[day] as AvailabilitySlot[]).length);
  const weekErrored = visibleDays.some((day) => days[day] === "error");
  const selectedState = days[selectedDate];
  const selectedSlots = Array.isArray(selectedState) ? selectedState : [];

  if (searching) {
    return (
      <LoadingRegion label="Finding available times" className="rounded-3xl border border-line p-4 sm:p-5">
        <p className="text-sm text-foreground/60">Finding the next available times…</p>
        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)}</div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-11" />)}</div>
      </LoadingRegion>
    );
  }

  return (
    <div className="rounded-3xl border border-line p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => void showWeek(addDays(weekStart, -7))} disabled={weekStart <= firstWeek} aria-label="Previous week" className="flex h-10 w-10 items-center justify-center rounded-full border border-line transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-30">
          <Chevron direction="left" />
        </button>
        <p className="text-sm font-semibold" aria-live="polite">{weekLabel(weekStart)}</p>
        <button type="button" onClick={() => void showWeek(addDays(weekStart, 7))} disabled={weekStart >= lastWeek} aria-label="Next week" className="flex h-10 w-10 items-center justify-center rounded-full border border-line transition-colors hover:bg-surface disabled:pointer-events-none disabled:opacity-30">
          <Chevron direction="right" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
        {visibleDays.map((day) => {
          const state = days[day];
          const past = day < today;
          const count = Array.isArray(state) ? state.length : 0;
          const selected = day === selectedDate;
          const loading = !past && state === undefined;
          const disabled = past || loading || count === 0;
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${formatDay(day)}${past ? "" : loading ? ", loading" : count ? `, ${count} times available` : ", no times available"}`}
              onClick={() => select(day, null)}
              className={`flex flex-col items-center rounded-2xl border px-0.5 py-2.5 transition-colors sm:py-3 ${
                selected ? "border-foreground bg-foreground text-white" : count ? "border-line bg-white hover:border-brand" : "border-transparent bg-surface/50 text-foreground/35"
              }`}
            >
              <span className={`text-[0.6rem] font-semibold uppercase tracking-wider sm:text-[0.65rem] ${selected ? "text-white/70" : ""}`}>{formatDay(day, { weekday: "short" })}</span>
              <span className="mt-1 font-heading text-xl leading-none sm:text-2xl">{Number(day.slice(8))}</span>
              <span className="mt-2 flex h-3.5 items-center text-[0.65rem] font-semibold">
                {loading ? (
                  <Skeleton className="h-2 w-6 rounded-full" />
                ) : past ? null : count ? (
                  <>
                    <span className={`h-1.5 w-1.5 rounded-full sm:hidden ${selected ? "bg-white" : "bg-brand-deep"}`} />
                    <span className={`hidden sm:inline ${selected ? "text-white/85" : "text-brand-deep"}`}>{count} free</span>
                  </>
                ) : (
                  <span className="hidden sm:inline">Full</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        {weekErrored && (
          <p role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-4 py-3 text-sm">
            Some days couldn&apos;t be loaded.
            <button type="button" onClick={retry} className="font-semibold underline decoration-brand underline-offset-4">Try again</button>
          </p>
        )}

        {takenNotice && (
          <p role="status" className="mb-4 rounded-xl bg-surface px-4 py-3 text-sm">Sorry, the time you picked has just been booked by someone else. Here are the latest times.</p>
        )}

        {nothingFound ? (
          <p className="text-sm leading-6 text-foreground/65">There are no free times in the next few weeks. Please get in touch and we&apos;ll do our best to fit you in.</p>
        ) : weekEmpty && !weekErrored ? (
          <div className="flex flex-col items-start gap-3 text-sm text-foreground/65 sm:flex-row sm:items-center sm:justify-between">
            <p>No free times this week.</p>
            {weekStart < lastWeek && (
              <button type="button" onClick={() => { setSearching(true); setNothingFound(false); void findFrom(addDays(weekStart, 7)); }} className="inline-flex min-h-10 items-center rounded-full border border-line px-4 font-semibold text-foreground hover:bg-surface">
                Show next available
              </button>
            )}
          </div>
        ) : selectedDate && visibleDays.includes(selectedDate) && selectedSlots.length ? (
          <div>
            <p className="text-sm font-semibold">{formatDay(selectedDate)}</p>
            <div className="mt-4 space-y-5">
              {periods.map((period) => {
                const periodSlots = selectedSlots.filter((slot) => period.test(Number(londonTimeInput(slot.starts_at).slice(0, 2))));
                if (!periodSlots.length) return null;
                return (
                  <div key={period.label}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">{period.label}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {periodSlots.map((slot) => {
                        const active = selectedSlot?.starts_at === slot.starts_at;
                        return (
                          <button
                            key={slot.starts_at}
                            type="button"
                            aria-pressed={active}
                            onClick={() => select(selectedDate, slot)}
                            className={`min-h-11 rounded-xl border px-2 text-sm font-semibold tabular-nums transition-colors ${active ? "border-foreground bg-foreground text-white" : "border-line bg-white hover:border-brand"}`}
                          >
                            {formatLondonTime(slot.starts_at)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : !weekLoaded ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-11" />)}</div>
        ) : (
          <p className="text-sm text-foreground/60">Choose a day above to see its times.</p>
        )}
      </div>
    </div>
  );
}
