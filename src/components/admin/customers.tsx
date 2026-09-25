"use client";

import { useMemo, useState, type FormEvent } from "react";

import { createAdminRecord, deleteAdminRecord, updateAdminRecord, type AdminCustomer } from "@/lib/admin-api";
import { formatLondonTime, formatPrice, londonDateInput, londonToday } from "@/lib/date-format";
import { ChevronRightIcon, MailIcon, PhoneIcon, PlusIcon, SearchIcon, TrashIcon, UsersIcon } from "./icons";
import { Badge, Button, Card, Drawer, EmptyState, Field, PageHeader, errorMessage, inputClass, useFeedback } from "./ui";
import { formatDay, initials, isActive, plural, statusMeta, type DashboardData, type Refresh } from "./utils";

type Summary = { visits: number; next?: string; last?: string; spent: number };

function Avatar({ name }: { name: string }) {
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-strong text-sm font-bold text-foreground/75">{initials(name)}</span>;
}

export function CustomersPanel({ data, refresh }: { data: DashboardData; refresh: Refresh }) {
  const { notify, confirm } = useFeedback();
  const today = londonToday();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminCustomer | "new" | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);

  const summaries = useMemo(() => {
    const map = new Map<string, Summary>();
    for (const appointment of data.appointments) {
      if (!isActive(appointment)) continue;
      const summary = map.get(appointment.customer_id) ?? { visits: 0, spent: 0 };
      const day = londonDateInput(appointment.starts_at);
      if (day < today) {
        summary.visits += 1;
        summary.spent += appointment.price_pence;
        if (!summary.last || day > summary.last) summary.last = day;
      } else if (!summary.next || day < summary.next) {
        summary.next = day;
      }
      map.set(appointment.customer_id, summary);
    }
    return map;
  }, [data.appointments, today]);

  const customers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return data.customers
      .filter((customer) => !customer.deleted_at)
      .filter((customer) => !search || `${customer.full_name} ${customer.email} ${customer.phone}`.toLowerCase().includes(search))
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [data.customers, query]);

  function open(customer: AdminCustomer | "new") {
    setEditing(customer);
    setForm(customer === "new" ? { full_name: "", email: "", phone: "" } : { full_name: customer.full_name, email: customer.email, phone: customer.phone });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (editing && editing !== "new") await updateAdminRecord("customers", editing.id, form);
      else await createAdminRecord("customers", form);
      await refresh();
      notify(editing === "new" ? `${form.full_name} added.` : "Customer details saved.");
      setEditing(null);
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "The customer could not be saved. Check the email isn't already in use."), "error");
    } finally {
      setBusy(false);
    }
  }

  async function anonymise(customer: AdminCustomer) {
    const answer = await confirm({
      title: "Remove this customer's details?",
      message: `${customer.full_name}'s name, email and phone number will be permanently erased. Their past appointments stay in your records without personal details. This can't be undone.`,
      confirmLabel: "Erase details",
    });
    if (!answer.confirmed) return;
    try {
      await deleteAdminRecord("customers", customer.id);
      await refresh();
      notify("Customer details erased.");
      setEditing(null);
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "The customer could not be removed."), "error");
    }
  }

  const current = editing && editing !== "new" ? editing : null;
  const history = current ? data.appointments.filter((appointment) => appointment.customer_id === current.id).slice().reverse() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Everyone who has booked with you. Customers are added automatically when they book online."
        actions={<Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => open("new")}>Add customer</Button>}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-3 h-5 w-5 text-foreground/35" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email or phone" aria-label="Search customers" className={`${inputClass} pl-11`} />
          </div>
          <p className="text-sm text-foreground/55">{plural(customers.length, "customer")}</p>
        </div>

        {customers.length ? (
          <>
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,2fr)_6rem_9rem_1.5rem] gap-4 border-b border-line px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-foreground/45 md:grid">
              <span>Name</span><span>Contact</span><span>Visits</span><span>Next visit</span><span />
            </div>
            <ul className="divide-y divide-line">
              {customers.map((customer) => {
                const summary = summaries.get(customer.id);
                return (
                  <li key={customer.id}>
                    <button type="button" onClick={() => open(customer)} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface/60 sm:px-6 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_6rem_9rem_1.5rem]">
                      <span className="flex min-w-0 items-center gap-3 max-md:contents">
                        <Avatar name={customer.full_name} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{customer.full_name}</span>
                          <span className="block truncate text-xs text-foreground/55 md:hidden">{customer.email}</span>
                        </span>
                      </span>
                      <span className="hidden min-w-0 text-sm md:block">
                        <span className="block truncate">{customer.email}</span>
                        <span className="block truncate text-foreground/55">{customer.phone}</span>
                      </span>
                      <span className="hidden text-sm tabular-nums md:block">{summary?.visits ?? 0}</span>
                      <span className="hidden text-sm md:block">{summary?.next ? formatDay(summary.next, { day: "numeric", month: "short", year: "numeric" }) : <span className="text-foreground/40">—</span>}</span>
                      <ChevronRightIcon className="h-4 w-4 justify-self-end text-foreground/30" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <EmptyState icon={<UsersIcon />} title={query ? "No matches" : "No customers yet"} description={query ? "Try a different name, email or phone number." : "Customers appear here as soon as they book."} />
        )}
      </Card>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        focusField={editing === "new"}
        title={current ? current.full_name : "Add customer"}
        description={current ? undefined : "Add someone who books with you by phone or in person."}
        footer={
          <>
            {current && <Button variant="ghost" className="mr-auto text-rose-700 hover:bg-rose-50 hover:text-rose-800" icon={<TrashIcon className="h-4 w-4" />} onClick={() => anonymise(current)}>Erase details</Button>}
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="customer-form" loading={busy}>{current ? "Save changes" : "Add customer"}</Button>
          </>
        }
      >
        <div className="space-y-7">
          {current && (
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line text-sm">
              {[
                ["Visits", String(summaries.get(current.id)?.visits ?? 0)],
                ["Spent", formatPrice(summaries.get(current.id)?.spent ?? 0)],
                ["Last visit", summaries.get(current.id)?.last ? formatDay(summaries.get(current.id)!.last!, { day: "numeric", month: "short" }) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="bg-white px-4 py-3"><p className="text-xs text-foreground/55">{label}</p><p className="mt-0.5 font-semibold">{value}</p></div>
              ))}
            </div>
          )}
          {current && (
            <div className="flex flex-wrap gap-2">
              <a href={`mailto:${current.email}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-xs font-semibold hover:bg-surface"><MailIcon className="h-4 w-4" />Email</a>
              <a href={`tel:${current.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-xs font-semibold hover:bg-surface"><PhoneIcon className="h-4 w-4" />Call</a>
            </div>
          )}
          <form id="customer-form" onSubmit={save} className="space-y-4">
            <Field label="Full name">{(id) => <input id={id} value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required minLength={2} className={inputClass} />}</Field>
            <Field label="Email">{(id) => <input id={id} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required className={inputClass} />}</Field>
            <Field label="Phone">{(id) => <input id={id} type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required minLength={5} className={inputClass} />}</Field>
          </form>
          {current && (
            <section>
              <h3 className="font-sans text-xs font-bold uppercase tracking-[0.18em] text-brand-deep">Appointment history</h3>
              {history.length ? (
                <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
                  {history.map((appointment) => (
                    <li key={appointment.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{appointment.treatment_name}</span>
                        <span className="block text-xs text-foreground/55">{formatDay(londonDateInput(appointment.starts_at), { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {formatLondonTime(appointment.starts_at)}</span>
                      </span>
                      <Badge tone={statusMeta[appointment.status].tone}>{statusMeta[appointment.status].label}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-foreground/55">No appointments yet.</p>
              )}
            </section>
          )}
        </div>
      </Drawer>
    </div>
  );
}
