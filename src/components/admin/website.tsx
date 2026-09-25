"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { createAdminRecord, deleteAdminRecord, updateAdminRecord, type AdminGalleryItem, type AdminProfile, type AdminSettings } from "@/lib/admin-api";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ImageIcon, PlusIcon, TrashIcon } from "./icons";
import { Badge, Button, Card, CardHeader, Drawer, EmptyState, Field, PageHeader, Switch, errorMessage, inputClass, textareaClass, useFeedback } from "./ui";
import { slugify, type DashboardData, type Refresh } from "./utils";

const emptyProfile: AdminProfile = { id: true, business_name: "", beautician_name: "", tagline: "", about_heading: "", about_body: "", contact_email: "", contact_phone: "", location: "", instagram_url: "", whatsapp_number: "" };
const emptySettings: AdminSettings = { id: true, timezone: "Europe/London", slot_interval_minutes: 15, cancellation_notice_hours: 24, minimum_booking_notice_minutes: 0 };

type GalleryForm = { id: string | null; slug: string; image_url: string; alt_text: string; caption: string; display_order: number; published: boolean; file: File | null; preview: string };

function Section({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="space-y-5 px-5 py-5 sm:px-6">{children}</div>
      <div className="flex justify-end border-t border-line px-5 py-3.5 sm:px-6">{footer}</div>
    </Card>
  );
}

function Suffix({ children, suffix }: { children: ReactNode; suffix: string }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-foreground/50">{suffix}</span>
    </div>
  );
}

export function WebsitePanel({ data, refresh }: { data: DashboardData; refresh: Refresh }) {
  const { notify, confirm } = useFeedback();
  const [profile, setProfile] = useState<AdminProfile>(data.profile ?? emptyProfile);
  const [settings, setSettings] = useState<AdminSettings>(data.settings ?? emptySettings);
  const [gallery, setGallery] = useState<GalleryForm | null>(null);
  const [busy, setBusy] = useState("");

  const comparable = (value: unknown) => JSON.stringify(value, (_key, field) => field ?? "");
  const profileDirty = comparable(profile) !== comparable(data.profile ?? emptyProfile);
  const settingsDirty = JSON.stringify(settings) !== JSON.stringify(data.settings ?? emptySettings);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile");
    try {
      // Blank optional fields must be null: the database validates any email that is present.
      const values = Object.fromEntries(Object.entries(profile)
        .filter(([key]) => key !== "id")
        .map(([key, value]) => [key, typeof value === "string" && !value.trim() && key !== "business_name" && key !== "beautician_name" ? null : value]));
      await updateAdminRecord("business_profile", null, values);
      await refresh();
      notify("Business details saved. The website is updated.");
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "Business details could not be saved."), "error");
    } finally {
      setBusy("");
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("settings");
    try {
      await updateAdminRecord("business_settings", null, {
        timezone: settings.timezone,
        slot_interval_minutes: Number(settings.slot_interval_minutes),
        cancellation_notice_hours: Number(settings.cancellation_notice_hours),
        minimum_booking_notice_minutes: Number(settings.minimum_booking_notice_minutes),
      });
      await refresh();
      notify("Booking rules saved.");
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "Booking rules could not be saved."), "error");
    } finally {
      setBusy("");
    }
  }

  function openGallery(item: AdminGalleryItem | null) {
    setGallery(item
      ? { id: item.id, slug: item.slug, image_url: item.image_url ?? "", alt_text: item.alt_text, caption: item.caption ?? "", display_order: item.display_order, published: item.published, file: null, preview: item.image_url ?? "" }
      : { id: null, slug: "", image_url: "", alt_text: "", caption: "", display_order: (data.gallery.at(-1)?.display_order ?? 0) + 1, published: true, file: null, preview: "" });
  }

  function chooseFile(file: File | null) {
    if (!gallery) return;
    setGallery({ ...gallery, file, preview: file ? URL.createObjectURL(file) : gallery.image_url });
  }

  async function saveGallery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gallery) return;
    setBusy("gallery");
    try {
      let imageUrl = gallery.image_url;
      let storagePath: string | undefined;
      if (gallery.file) {
        const safeName = gallery.file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        storagePath = `gallery/${crypto.randomUUID()}-${safeName}`;
        const storage = createSupabaseBrowserClient().storage.from("gallery");
        const upload = await storage.upload(storagePath, gallery.file, { contentType: gallery.file.type, upsert: false });
        if (upload.error) throw upload.error;
        imageUrl = storage.getPublicUrl(storagePath).data.publicUrl;
      }
      if (!imageUrl) throw new Error("Choose a photo to upload.");
      // Slugs are unique, so give new photos a short random suffix in case two share a caption.
      const slug = gallery.slug || `${slugify(gallery.caption || gallery.alt_text) || "photo"}-${crypto.randomUUID().slice(0, 6)}`;
      const payload = { slug, image_url: imageUrl, alt_text: gallery.alt_text, caption: gallery.caption || null, display_order: gallery.display_order, published: gallery.published, ...(storagePath ? { storage_path: storagePath } : {}) };
      if (gallery.id) await updateAdminRecord("gallery_items", gallery.id, payload);
      else await createAdminRecord("gallery_items", payload);
      await refresh();
      notify(gallery.id ? "Photo updated." : "Photo added to the gallery.");
      setGallery(null);
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "The photo could not be saved."), "error");
    } finally {
      setBusy("");
    }
  }

  async function removeGallery() {
    if (!gallery?.id) return;
    const id = gallery.id;
    const answer = await confirm({ title: "Delete this photo?", message: "It will be removed from your website gallery.", confirmLabel: "Delete photo" });
    if (!answer.confirmed) return;
    try {
      await deleteAdminRecord("gallery_items", id);
      await refresh();
      notify("Photo deleted.");
      setGallery(null);
    } catch (requestError: unknown) {
      notify(errorMessage(requestError, "The photo could not be deleted."), "error");
    }
  }

  const text = (field: keyof Omit<AdminProfile, "id">, label: string, options: { hint?: string; type?: string; placeholder?: string; required?: boolean } = {}) => (
    <Field label={label} hint={options.hint}>
      {(id) => <input id={id} type={options.type ?? "text"} value={profile[field] ?? ""} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} placeholder={options.placeholder} required={options.required} className={inputClass} />}
    </Field>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Website" description="Update what customers see on your site, and the rules for online booking." />

      <form onSubmit={saveProfile}>
        <Section title="Business details" description="Shown across the website and in emails." footer={<Button type="submit" loading={busy === "profile"} disabled={!profileDirty}>Save details</Button>}>
          <div className="grid gap-5 sm:grid-cols-2">
            {text("business_name", "Business name", { required: true })}
            {text("beautician_name", "Your name", { required: true })}
          </div>
          {text("tagline", "Tagline", { hint: "A short line shown on the home page." })}
          <div className="grid gap-5 sm:grid-cols-2">
            {text("contact_email", "Contact email", { type: "email" })}
            {text("contact_phone", "Contact phone", { type: "tel" })}
          </div>
          {text("location", "Location", { placeholder: "e.g. Manchester" })}
          <div className="grid gap-5 sm:grid-cols-2">
            {text("instagram_url", "Instagram link", { type: "url", placeholder: "https://instagram.com/…" })}
            {text("whatsapp_number", "WhatsApp number", { type: "tel" })}
          </div>
          {text("about_heading", "About page heading")}
          <Field label="About you" hint="The main text on your About page.">
            {(id) => <textarea id={id} value={profile.about_body ?? ""} onChange={(event) => setProfile({ ...profile, about_body: event.target.value })} rows={6} className={textareaClass} />}
          </Field>
        </Section>
      </form>

      <form onSubmit={saveSettings}>
        <Section title="Booking rules" description="Controls which times customers are offered online." footer={<Button type="submit" loading={busy === "settings"} disabled={!settingsDirty}>Save rules</Button>}>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Start times every" hint="e.g. 15 offers 9:00, 9:15, 9:30…">
              {(id) => <Suffix suffix="mins"><input id={id} type="number" min="5" max="120" step="5" value={settings.slot_interval_minutes} onChange={(event) => setSettings({ ...settings, slot_interval_minutes: Number(event.target.value) })} className={`${inputClass} pr-14`} /></Suffix>}
            </Field>
            <Field label="Book at least" hint="How far ahead customers must book.">
              {(id) => <Suffix suffix="mins"><input id={id} type="number" min="0" step="15" value={settings.minimum_booking_notice_minutes} onChange={(event) => setSettings({ ...settings, minimum_booking_notice_minutes: Number(event.target.value) })} className={`${inputClass} pr-14`} /></Suffix>}
            </Field>
            <Field label="Cancel / change up to" hint="Before the appointment, online.">
              {(id) => <Suffix suffix="hours"><input id={id} type="number" min="0" value={settings.cancellation_notice_hours} onChange={(event) => setSettings({ ...settings, cancellation_notice_hours: Number(event.target.value) })} className={`${inputClass} pr-16`} /></Suffix>}
            </Field>
          </div>
        </Section>
      </form>

      <Card>
        <CardHeader title="Gallery" description="Photos shown on your gallery page." action={<Button size="sm" icon={<PlusIcon className="h-4 w-4" />} onClick={() => openGallery(null)}>Add photo</Button>} />
        {data.gallery.length ? (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-4">
            {data.gallery.map((item) => (
              <button key={item.id} type="button" onClick={() => openGallery(item)} className="group overflow-hidden rounded-xl border border-line bg-white text-left transition-shadow hover:shadow-md">
                <div className="relative aspect-square bg-surface">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnails come from arbitrary storage URLs
                    <img src={item.image_url} alt={item.alt_text} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-foreground/30"><ImageIcon className="h-8 w-8" /></span>
                  )}
                  {!item.published && <span className="absolute left-2 top-2"><Badge>Hidden</Badge></span>}
                </div>
                <p className="truncate px-3 py-2 text-xs font-semibold">{item.caption || item.alt_text}</p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState icon={<ImageIcon />} title="No photos yet" description="Show off your work — add photos of treatments and your space." />
        )}
      </Card>

      <Drawer
        open={gallery !== null}
        onClose={() => setGallery(null)}
        title={gallery?.id ? "Edit photo" : "Add photo"}
        footer={
          <>
            {gallery?.id && <Button variant="ghost" className="mr-auto text-rose-700 hover:bg-rose-50 hover:text-rose-800" icon={<TrashIcon className="h-4 w-4" />} onClick={removeGallery}>Delete</Button>}
            <Button variant="secondary" onClick={() => setGallery(null)}>Cancel</Button>
            <Button type="submit" form="gallery-form" loading={busy === "gallery"}>{gallery?.id ? "Save changes" : "Add photo"}</Button>
          </>
        }
      >
        {gallery && (
          <form id="gallery-form" onSubmit={saveGallery} className="space-y-5">
            <label className="group relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-white text-center transition-colors hover:border-brand">
              {gallery.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob previews can't go through next/image
                <img src={gallery.preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="h-8 w-8 text-foreground/35" />
                  <span className="mt-2 text-sm font-semibold">Choose a photo</span>
                  <span className="text-xs text-foreground/55">JPG, PNG or WebP</span>
                </>
              )}
              {gallery.preview && <span className="absolute bottom-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold shadow">Replace photo</span>}
              <input type="file" accept="image/*" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} className="sr-only" />
            </label>
            <Field label="Description for screen readers" hint="Describe the photo, e.g. 'Close-up of a lash lift result'.">
              {(id) => <input id={id} value={gallery.alt_text} onChange={(event) => setGallery({ ...gallery, alt_text: event.target.value })} required minLength={2} maxLength={200} className={inputClass} />}
            </Field>
            <Field label="Caption" hint="Optional, shown under the photo.">
              {(id) => <input id={id} value={gallery.caption} onChange={(event) => setGallery({ ...gallery, caption: event.target.value })} className={inputClass} />}
            </Field>
            <Card className="p-4">
              <Switch checked={gallery.published} onChange={(published) => setGallery({ ...gallery, published })} label="Show on website" />
            </Card>
          </form>
        )}
      </Drawer>
    </div>
  );
}
