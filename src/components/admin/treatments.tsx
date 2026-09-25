"use client";

import { useState, type FormEvent } from "react";

import { createAdminRecord, deleteAdminRecord, updateAdminRecord, type AdminTreatment } from "@/lib/admin-api";
import { formatPrice } from "@/lib/date-format";
import { ChevronDownIcon, ChevronUpIcon, ClockIcon, EditIcon, PlusIcon, SparkleIcon, TrashIcon } from "./icons";
import { Badge, Button, Card, Drawer, EmptyState, Field, IconButton, PageHeader, Switch, errorMessage, inputClass, textareaClass, useFeedback } from "./ui";
import { slugify, type Refresh } from "./utils";

const blankForm = { name: "", slug: "", description: "", price: "", duration_minutes: "60", active: true };

export function TreatmentsPanel({ treatments, refresh }: { treatments: AdminTreatment[]; refresh: Refresh }) {
  const { notify, confirm } = useFeedback();
  const [editing, setEditing] = useState<AdminTreatment | "new" | null>(null);
  const [form, setForm] = useState(blankForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState("");

  const sorted = treatments.slice().sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));

  function open(treatment: AdminTreatment | "new") {
    setEditing(treatment);
    setSlugTouched(treatment !== "new");
    setForm(treatment === "new" ? blankForm : {
      name: treatment.name,
      slug: treatment.slug,
      description: treatment.description ?? "",
      price: (treatment.price_pence / 100).toFixed(2).replace(/\.00$/, ""),
      duration_minutes: String(treatment.duration_minutes),
      active: treatment.active,
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("save");
    const payload = {
      name: form.name.trim(),
      slug: form.slug || slugify(form.name),
      description: form.description.trim() || null,
      price_pence: Math.round(Number(form.price) * 100),
      duration_minutes: Number(form.duration_minutes),
      active: form.active,
      ...(editing === "new" ? { display_order: (sorted.at(-1)?.display_order ?? 0) + 1 } : {}),
    };
    try {
      if (editing && editing !== "new") await updateAdminRecord("treatments", editing.id, payload);
      else await createAdminRecord("treatments", payload);
      await refresh();
      notify(editing === "new" ? `${payload.name} added.` : "Treatment saved.");
      setEditing(null);
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "The treatment could not be saved. The web address may already be in use."), "error");
    } finally {
      setBusy("");
    }
  }

  async function toggle(treatment: AdminTreatment) {
    setBusy(treatment.id);
    try {
      await updateAdminRecord("treatments", treatment.id, { active: !treatment.active });
      await refresh();
      notify(treatment.active ? `${treatment.name} is now hidden from the website.` : `${treatment.name} is now live on the website.`);
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "The treatment could not be updated."), "error");
    } finally {
      setBusy("");
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const other = sorted[index + direction];
    const treatment = sorted[index];
    if (!other) return;
    setBusy(treatment.id);
    try {
      // Renumber everything so ties from older data can't make the swap a no-op.
      const reordered = sorted.slice();
      reordered[index] = other;
      reordered[index + direction] = treatment;
      await Promise.all(reordered.map((item, position) => item.display_order === position ? null : updateAdminRecord("treatments", item.id, { display_order: position })));
      await refresh();
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "The order could not be changed."), "error");
    } finally {
      setBusy("");
    }
  }

  async function remove(treatment: AdminTreatment) {
    const answer = await confirm({
      title: `Delete ${treatment.name}?`,
      message: "It will be removed from your menu for good. If you might offer it again, hide it instead.",
      confirmLabel: "Delete treatment",
    });
    if (!answer.confirmed) return;
    try {
      await deleteAdminRecord("treatments", treatment.id);
      await refresh();
      notify("Treatment deleted.");
      setEditing(null);
    } catch {
      notify("This treatment has bookings against it, so it can't be deleted. Hide it from the website instead.", "error");
    }
  }

  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Treatments"
        description="Your menu of services. Live treatments can be booked online; hidden ones stay in your records but aren't shown to customers."
        actions={<Button icon={<PlusIcon className="h-4 w-4" />} onClick={() => open("new")}>Add treatment</Button>}
      />

      <Card>
        {sorted.length ? (
          <ul className="divide-y divide-line">
            {sorted.map((treatment, index) => (
              <li key={treatment.id} className={`flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6 ${busy === treatment.id ? "opacity-60" : ""}`}>
                <div className="hidden flex-col sm:flex">
                  <IconButton label="Move up" className="h-7 w-7" disabled={index === 0 || Boolean(busy)} onClick={() => move(index, -1)}><ChevronUpIcon className="h-4 w-4" /></IconButton>
                  <IconButton label="Move down" className="h-7 w-7" disabled={index === sorted.length - 1 || Boolean(busy)} onClick={() => move(index, 1)}><ChevronDownIcon className="h-4 w-4" /></IconButton>
                </div>
                <button type="button" onClick={() => open(treatment)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-xl leading-snug">{treatment.name}</p>
                    {!treatment.active && <Badge>Hidden</Badge>}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground/65">
                    <span className="font-semibold text-foreground">{formatPrice(treatment.price_pence)}</span>
                    <span className="inline-flex items-center gap-1"><ClockIcon className="h-4 w-4" />{treatment.duration_minutes} min</span>
                  </p>
                  {treatment.description && <p className="mt-1.5 line-clamp-1 text-sm text-foreground/55">{treatment.description}</p>}
                </button>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="w-36"><Switch checked={treatment.active} disabled={Boolean(busy)} onChange={() => toggle(treatment)} label={treatment.active ? "Live" : "Hidden"} /></div>
                  <Button size="sm" variant="secondary" icon={<EditIcon className="h-4 w-4" />} onClick={() => open(treatment)}>Edit</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<SparkleIcon />} title="No treatments yet" description="Add your first treatment so customers can start booking." action={<Button size="sm" icon={<PlusIcon className="h-4 w-4" />} onClick={() => open("new")}>Add treatment</Button>} />
        )}
      </Card>

      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={current ? "Edit treatment" : "New treatment"}
        description={current ? current.name : "Add a service to your menu."}
        footer={
          <>
            {current && <Button variant="ghost" className="mr-auto text-rose-700 hover:bg-rose-50 hover:text-rose-800" icon={<TrashIcon className="h-4 w-4" />} onClick={() => remove(current)}>Delete</Button>}
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="treatment-form" loading={busy === "save"}>{current ? "Save changes" : "Add treatment"}</Button>
          </>
        }
      >
        <form id="treatment-form" onSubmit={save} className="space-y-5">
          <Field label="Name">
            {(id) => <input id={id} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value, slug: slugTouched ? form.slug : slugify(event.target.value) })} required minLength={2} maxLength={120} placeholder="e.g. Signature facial" className={inputClass} />}
          </Field>
          <Field label="Description" hint="Shown on the treatments page and during booking.">
            {(id) => <textarea id={id} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className={textareaClass} />}
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price">
              {(id) => (
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-foreground/50">£</span>
                  <input id={id} type="number" inputMode="decimal" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required className={`${inputClass} pl-8`} />
                </div>
              )}
            </Field>
            <Field label="Duration">
              {(id) => (
                <div className="relative">
                  <input id={id} type="number" inputMode="numeric" min="5" max="1440" step="5" value={form.duration_minutes} onChange={(event) => setForm({ ...form, duration_minutes: event.target.value })} required className={`${inputClass} pr-14`} />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-foreground/50">mins</span>
                </div>
              )}
            </Field>
          </div>
          <Card className="p-4">
            <Switch checked={form.active} onChange={(active) => setForm({ ...form, active })} label="Live on website" description="Customers can see and book this treatment." />
          </Card>
          <details className="group rounded-2xl border border-line bg-white p-4">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">Advanced <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
            <Field label="Web address" hint="Lowercase letters, numbers and dashes only." className="mt-4">
              {(id) => <input id={id} value={form.slug} onChange={(event) => { setSlugTouched(true); setForm({ ...form, slug: event.target.value.toLowerCase() }); }} onBlur={() => setForm((current) => ({ ...current, slug: slugify(current.slug) }))} required pattern="[a-z0-9]+(-[a-z0-9]+)*" className={inputClass} />}
            </Field>
          </details>
        </form>
      </Drawer>
    </div>
  );
}
