"use client";

import { useState, type FormEvent } from "react";

import { createAdminRecord, deleteAdminRecord, updateAdminRecord, type AdminBlockedTime } from "@/lib/admin-api";
import { formatLondonTime, londonDateInput, londonToday } from "@/lib/date-format";
import { AlertIcon, BanIcon, EditIcon, PlusIcon, TrashIcon } from "./icons";
import { Button, Card, CardHeader, Drawer, EmptyState, Field, PageHeader, Switch, errorMessage, inputClass, useFeedback, useNow } from "./ui";
import { addDays, dayNames, formatDay, hhmm, isActive, localDateTime, plural, weekOrder, type DashboardData, type Refresh } from "./utils";

type HourForm = { id: string | null; day_of_week: number; starts_at: string; ends_at: string };
type BlockForm = { id: string | null; allDay: boolean; startDate: string; endDate: string; startsAt: string; endsAt: string; reason: string };

function describeBlock(block: AdminBlockedTime) {
  const start = new Date(block.starts_at);
  const end = new Date(block.ends_at);
  const startDay = londonDateInput(block.starts_at);
  const allDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 0 && end.getMinutes() === 0;
  if (allDay) {
    const lastDay = addDays(londonDateInput(block.ends_at), -1);
    const short = { weekday: "short", day: "numeric", month: "short" } as const;
    return lastDay === startDay ? `${formatDay(startDay, short)} · All day` : `${formatDay(startDay, short)} – ${formatDay(lastDay, short)} · All day`;
  }
  const endDay = londonDateInput(block.ends_at);
  const short = { weekday: "short", day: "numeric", month: "short" } as const;
  return endDay === startDay
    ? `${formatDay(startDay, short)} · ${formatLondonTime(block.starts_at)}–${formatLondonTime(block.ends_at)}`
    : `${formatDay(startDay, short)} ${formatLondonTime(block.starts_at)} – ${formatDay(endDay, short)} ${formatLondonTime(block.ends_at)}`;
}

function blockRange(form: BlockForm) {
  if (form.allDay) {
    return { starts_at: new Date(`${form.startDate}T00:00`), ends_at: new Date(`${addDays(form.endDate || form.startDate, 1)}T00:00`) };
  }
  return { starts_at: new Date(form.startsAt), ends_at: new Date(form.endsAt) };
}

export function AvailabilityPanel({ data, refresh }: { data: DashboardData; refresh: Refresh }) {
  const { notify, confirm } = useFeedback();
  const today = londonToday();
  const [hourForm, setHourForm] = useState<HourForm | null>(null);
  const [blockForm, setBlockForm] = useState<BlockForm | null>(null);
  const [busy, setBusy] = useState("");
  const [showPast, setShowPast] = useState(false);
  const now = useNow();

  async function run(key: string, action: () => Promise<unknown>, success: string, failure: string) {
    setBusy(key);
    try {
      await action();
      await refresh();
      notify(success);
      return true;
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, failure), "error");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function toggleDay(day: number, open: boolean) {
    const rows = data.workingHours.filter((hour) => hour.day_of_week === day);
    const name = dayNames[day];
    if (open && !rows.length) {
      return run(`day-${day}`, () => createAdminRecord("working_hours", { day_of_week: day, starts_at: "09:00", ends_at: "17:00", is_enabled: true }), `${name}s are now open, 09:00–17:00. Tap the hours to change them.`, "Opening hours could not be saved.");
    }
    return run(`day-${day}`, () => Promise.all(rows.map((row) => updateAdminRecord("working_hours", row.id, { is_enabled: open }))), open ? `${name}s are now open.` : `${name}s are now closed for online booking.`, "Opening hours could not be saved.");
  }

  async function saveHours(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hourForm) return;
    if (hourForm.ends_at <= hourForm.starts_at) return notify("The closing time must be after the opening time.", "error");
    const payload = { day_of_week: hourForm.day_of_week, starts_at: hourForm.starts_at, ends_at: hourForm.ends_at, is_enabled: true };
    const saved = await run("hours", () => hourForm.id ? updateAdminRecord("working_hours", hourForm.id, payload) : createAdminRecord("working_hours", payload), "Opening hours saved.", "Opening hours could not be saved. They may overlap another set of hours.");
    if (saved) setHourForm(null);
  }

  async function removeHours() {
    if (!hourForm?.id) return;
    const id = hourForm.id;
    const removed = await run("hours-delete", () => deleteAdminRecord("working_hours", id), "Hours removed.", "Hours could not be removed.");
    if (removed) setHourForm(null);
  }

  async function saveBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!blockForm) return;
    const range = blockRange(blockForm);
    if (!(range.ends_at > range.starts_at)) return notify("The end must be after the start.", "error");
    const payload = { starts_at: range.starts_at.toISOString(), ends_at: range.ends_at.toISOString(), reason: blockForm.reason.trim() || null };
    const saved = await run("block", () => blockForm.id ? updateAdminRecord("blocked_times", blockForm.id, payload) : createAdminRecord("blocked_times", payload), "Time off saved. Customers can't book during it.", "Time off could not be saved. It may overlap time off you've already added.");
    if (saved) setBlockForm(null);
  }

  async function removeBlock(block: AdminBlockedTime) {
    const answer = await confirm({ title: "Remove this time off?", message: `${describeBlock(block)} will become bookable again (within your opening hours).`, confirmLabel: "Remove", tone: "primary" });
    if (!answer.confirmed) return;
    const removed = await run(block.id, () => deleteAdminRecord("blocked_times", block.id), "Time off removed.", "Time off could not be removed.");
    if (removed) setBlockForm(null);
  }

  function editBlock(block: AdminBlockedTime) {
    const start = new Date(block.starts_at);
    const end = new Date(block.ends_at);
    const allDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 0 && end.getMinutes() === 0;
    setBlockForm({
      id: block.id,
      allDay,
      startDate: londonDateInput(block.starts_at),
      endDate: allDay ? addDays(londonDateInput(block.ends_at), -1) : londonDateInput(block.ends_at),
      startsAt: localDateTime(block.starts_at),
      endsAt: localDateTime(block.ends_at),
      reason: block.reason ?? "",
    });
  }

  const blocks = data.blockedTimes.slice().sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcomingBlocks = blocks.filter((block) => new Date(block.ends_at).getTime() > now);
  const pastBlocks = blocks.filter((block) => new Date(block.ends_at).getTime() <= now).reverse();

  let clashes = 0;
  if (blockForm) {
    const range = blockRange(blockForm);
    if (range.ends_at > range.starts_at) {
      clashes = data.appointments.filter((appointment) => isActive(appointment) && new Date(appointment.starts_at) < range.ends_at && new Date(appointment.ends_at) > range.starts_at).length;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Opening hours" description="Set when customers can book online, and block out holidays or breaks. Existing appointments are never moved automatically." />

      <Card>
        <CardHeader title="Weekly hours" description="Your regular schedule. Customers can only book inside these times." />
        <ul className="divide-y divide-line">
          {weekOrder.map((day) => {
            const rows = data.workingHours.filter((hour) => hour.day_of_week === day).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
            const openRows = rows.filter((hour) => hour.is_enabled);
            const isOpen = openRows.length > 0;
            return (
              <li key={day} className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6 ${busy === `day-${day}` ? "opacity-60" : ""}`}>
                <div className="w-44 shrink-0">
                  <Switch checked={isOpen} disabled={Boolean(busy)} onChange={(open) => toggleDay(day, open)} label={dayNames[day]} />
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {isOpen ? (
                    <>
                      {openRows.map((hour) => (
                        <button key={hour.id} type="button" onClick={() => setHourForm({ id: hour.id, day_of_week: day, starts_at: hhmm(hour.starts_at), ends_at: hhmm(hour.ends_at) })} className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-sm font-semibold tabular-nums transition-colors hover:border-brand hover:bg-surface/60">
                          {hhmm(hour.starts_at)} – {hhmm(hour.ends_at)}
                          <EditIcon className="h-3.5 w-3.5 text-foreground/40" />
                        </button>
                      ))}
                      <button type="button" onClick={() => setHourForm({ id: null, day_of_week: day, starts_at: "", ends_at: "" })} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold text-brand-deep hover:bg-surface">
                        <PlusIcon className="h-4 w-4" /> Add hours
                      </button>
                    </>
                  ) : (
                    <span className="text-sm text-foreground/45">Closed</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader
          title="Time off"
          description="Holidays, training days or breaks. No one can book during these times."
          action={<Button size="sm" icon={<PlusIcon className="h-4 w-4" />} onClick={() => setBlockForm({ id: null, allDay: true, startDate: today, endDate: today, startsAt: `${today}T12:00`, endsAt: `${today}T13:00`, reason: "" })}>Add time off</Button>}
        />
        {upcomingBlocks.length ? (
          <ul className="divide-y divide-line">
            {upcomingBlocks.map((block) => (
              <li key={block.id} className="flex items-center gap-4 px-5 py-3.5 sm:px-6">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><BanIcon className="h-4 w-4" /></span>
                <button type="button" onClick={() => editBlock(block)} className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-semibold">{describeBlock(block)}</span>
                  <span className="block truncate text-xs text-foreground/55">{block.reason || "No reason given"}</span>
                </button>
                <Button size="sm" variant="ghost" icon={<EditIcon className="h-4 w-4" />} onClick={() => editBlock(block)}>Edit</Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<BanIcon />} title="No time off planned" description="Going on holiday? Add it here so customers can't book while you're away." />
        )}
        {pastBlocks.length > 0 && (
          <div className="border-t border-line px-5 py-3 sm:px-6">
            <button type="button" onClick={() => setShowPast(!showPast)} className="text-xs font-semibold text-foreground/55 hover:text-foreground">
              {showPast ? "Hide" : "Show"} past time off ({pastBlocks.length})
            </button>
            {showPast && (
              <ul className="mt-2 space-y-1.5 text-sm text-foreground/55">
                {pastBlocks.map((block) => <li key={block.id}>{describeBlock(block)}{block.reason ? ` · ${block.reason}` : ""}</li>)}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Drawer
        open={hourForm !== null}
        onClose={() => setHourForm(null)}
        title={hourForm ? `${dayNames[hourForm.day_of_week]} hours` : ""}
        description="Add a second set of hours to allow for a lunch break."
        footer={
          <>
            {hourForm?.id && <Button variant="ghost" className="mr-auto text-rose-700 hover:bg-rose-50 hover:text-rose-800" icon={<TrashIcon className="h-4 w-4" />} loading={busy === "hours-delete"} onClick={removeHours}>Remove</Button>}
            <Button variant="secondary" onClick={() => setHourForm(null)}>Cancel</Button>
            <Button type="submit" form="hours-form" loading={busy === "hours"}>Save hours</Button>
          </>
        }
      >
        {hourForm && (
          <form id="hours-form" onSubmit={saveHours} className="space-y-5">
            <Field label="Day">
              {(id) => <select id={id} value={hourForm.day_of_week} onChange={(event) => setHourForm({ ...hourForm, day_of_week: Number(event.target.value) })} className={inputClass}>{weekOrder.map((day) => <option key={day} value={day}>{dayNames[day]}</option>)}</select>}
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Opens">{(id) => <input id={id} type="time" value={hourForm.starts_at} onChange={(event) => setHourForm({ ...hourForm, starts_at: event.target.value })} required className={inputClass} />}</Field>
              <Field label="Closes">{(id) => <input id={id} type="time" value={hourForm.ends_at} onChange={(event) => setHourForm({ ...hourForm, ends_at: event.target.value })} required className={inputClass} />}</Field>
            </div>
            <p className="text-xs leading-5 text-foreground/55">The last appointment must finish by closing time.</p>
          </form>
        )}
      </Drawer>

      <Drawer
        open={blockForm !== null}
        onClose={() => setBlockForm(null)}
        title={blockForm?.id ? "Edit time off" : "Add time off"}
        description="Customers won't be able to book during this time."
        footer={
          <>
            {blockForm?.id && <Button variant="ghost" className="mr-auto text-rose-700 hover:bg-rose-50 hover:text-rose-800" icon={<TrashIcon className="h-4 w-4" />} onClick={() => { const block = data.blockedTimes.find((item) => item.id === blockForm.id); if (block) removeBlock(block); }}>Remove</Button>}
            <Button variant="secondary" onClick={() => setBlockForm(null)}>Cancel</Button>
            <Button type="submit" form="block-form" loading={busy === "block"}>Save time off</Button>
          </>
        }
      >
        {blockForm && (
          <form id="block-form" onSubmit={saveBlock} className="space-y-5">
            <Card className="p-4">
              <Switch checked={blockForm.allDay} onChange={(allDay) => setBlockForm({ ...blockForm, allDay })} label="All day" description="Block whole days, e.g. for a holiday." />
            </Card>
            {blockForm.allDay ? (
              <div className="grid grid-cols-2 gap-4">
                <Field label="First day">{(id) => <input id={id} type="date" value={blockForm.startDate} onChange={(event) => setBlockForm({ ...blockForm, startDate: event.target.value, endDate: event.target.value > blockForm.endDate ? event.target.value : blockForm.endDate })} required className={inputClass} />}</Field>
                <Field label="Last day">{(id) => <input id={id} type="date" min={blockForm.startDate} value={blockForm.endDate} onChange={(event) => setBlockForm({ ...blockForm, endDate: event.target.value })} required className={inputClass} />}</Field>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="From">{(id) => <input id={id} type="datetime-local" value={blockForm.startsAt} onChange={(event) => setBlockForm({ ...blockForm, startsAt: event.target.value })} required className={inputClass} />}</Field>
                <Field label="Until">{(id) => <input id={id} type="datetime-local" min={blockForm.startsAt} value={blockForm.endsAt} onChange={(event) => setBlockForm({ ...blockForm, endsAt: event.target.value })} required className={inputClass} />}</Field>
              </div>
            )}
            <Field label="Reason" hint="Just for you — customers won't see this.">
              {(id) => <input id={id} value={blockForm.reason} onChange={(event) => setBlockForm({ ...blockForm, reason: event.target.value })} placeholder="e.g. Holiday" className={inputClass} />}
            </Field>
            {clashes > 0 && (
              <p className="flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertIcon className="h-5 w-5" />
                {plural(clashes, "existing appointment")} fall{clashes === 1 ? "s" : ""} in this time. They won&apos;t be cancelled — reschedule or cancel them from the calendar if needed.
              </p>
            )}
          </form>
        )}
      </Drawer>
    </div>
  );
}

