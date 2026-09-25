"use client";

import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { getAdminDashboardData } from "@/lib/admin-api";
import { londonDateInput, londonToday } from "@/lib/date-format";
import { AdminSkeleton } from "@/components/admin/skeleton";
import { AppointmentsPanel } from "@/components/admin/appointments";
import { AvailabilityPanel } from "@/components/admin/availability";
import { CustomersPanel } from "@/components/admin/customers";
import { OverviewPanel } from "@/components/admin/overview";
import { isAdminSection, type AdminSection } from "@/components/admin/sections";
import { TreatmentsPanel } from "@/components/admin/treatments";
import { Button, FeedbackProvider } from "@/components/admin/ui";
import { WebsitePanel } from "@/components/admin/website";
import { AlertIcon, CalendarIcon, ClockIcon, ExternalIcon, GlobeIcon, HomeIcon, LogoutIcon, RefreshIcon, SparkleIcon, UsersIcon } from "@/components/admin/icons";
import { initials, isActive, type DashboardData } from "@/components/admin/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const navigation: { key: AdminSection; label: string; icon: typeof HomeIcon }[] = [
  { key: "overview", label: "Today", icon: HomeIcon },
  { key: "calendar", label: "Calendar", icon: CalendarIcon },
  { key: "customers", label: "Customers", icon: UsersIcon },
  { key: "treatments", label: "Treatments", icon: SparkleIcon },
  { key: "availability", label: "Opening hours", icon: ClockIcon },
  { key: "website", label: "Website", icon: GlobeIcon },
];

export function AdminDashboard({ displayName }: { displayName?: string | null }) {
  return (
    <FeedbackProvider>
      <AdminWorkspace displayName={displayName} />
    </FeedbackProvider>
  );
}

function AdminWorkspace({ displayName }: { displayName?: string | null }) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [section, setSection] = useState<AdminSection>("overview");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await getAdminDashboardData());
      setError("");
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "The admin dashboard could not be loaded");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadForEffect = useEffectEvent(load);
  useEffect(() => {
    const task = window.setTimeout(() => void loadForEffect(), 0);
    return () => window.clearTimeout(task);
  }, []);

  // Keep the open section in the URL hash so a refresh or the back button lands in the same place.
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash.slice(1);
      setSection(isAdminSection(hash) ? hash : "overview");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const navigate = useCallback((next: AdminSection) => {
    setSection(next);
    if (window.location.hash.slice(1) !== next) window.history.pushState(null, "", `#${next}`);
    window.scrollTo({ top: 0 });
  }, []);

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  if (!data && !error) return <AdminSkeleton />;

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-16">
        <div role="alert" className="w-full max-w-md rounded-3xl border border-line bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-700"><AlertIcon /></span>
          <h1 className="mt-4 text-2xl">We couldn&apos;t load your workspace</h1>
          <p className="mt-2 text-sm leading-6 text-foreground/65">{error}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="secondary" onClick={signOut}>Sign out</Button>
            <Button icon={<RefreshIcon className="h-4 w-4" />} loading={refreshing} onClick={() => void load()}>Try again</Button>
          </div>
        </div>
      </main>
    );
  }

  const today = londonToday();
  const todayCount = data.appointments.filter((appointment) => isActive(appointment) && londonDateInput(appointment.starts_at) === today).length;
  const name = displayName || "Admin";

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-white lg:flex">
        <div className="px-6 pb-6 pt-7">
          <Link href="/" className="block">
            <span className="block font-heading text-2xl leading-none">Sculpted</span>
            <span className="mt-1 block pl-5 text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-brand-deep">by Ruby · Admin</span>
          </Link>
        </div>
        <nav aria-label="Admin sections" className="flex-1 space-y-0.5 px-3">
          {navigation.map(({ key, label, icon: Icon }) => {
            const active = section === key;
            return (
              <button key={key} type="button" onClick={() => navigate(key)} aria-current={active ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-surface text-foreground" : "text-foreground/60 hover:bg-surface/60 hover:text-foreground"}`}>
                <Icon className={`h-5 w-5 ${active ? "text-brand-deep" : ""}`} />
                <span className="flex-1 text-left">{label}</span>
                {key === "overview" && todayCount > 0 && <span className="rounded-full bg-foreground px-2 py-0.5 text-[0.65rem] font-bold text-white">{todayCount}</span>}
              </button>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground/60 hover:bg-surface/60 hover:text-foreground">
            <ExternalIcon className="h-5 w-5" /> View website
          </Link>
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-xs font-bold text-brand-deep">{initials(name)}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</span>
            <button type="button" onClick={signOut} aria-label="Sign out" title="Sign out" className="rounded-full p-1.5 text-foreground/50 hover:bg-surface hover:text-foreground"><LogoutIcon className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar + tabs */}
        <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="block">
              <span className="block font-heading text-xl leading-none">Sculpted</span>
              <span className="mt-0.5 block pl-4 text-[0.55rem] font-semibold uppercase tracking-[0.3em] text-brand-deep">Admin</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/" target="_blank" aria-label="View website" className="rounded-full p-2 text-foreground/60 hover:bg-surface"><ExternalIcon className="h-5 w-5" /></Link>
              <button type="button" onClick={signOut} aria-label="Sign out" className="rounded-full p-2 text-foreground/60 hover:bg-surface"><LogoutIcon className="h-5 w-5" /></button>
            </div>
          </div>
          <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
            {navigation.map(({ key, label, icon: Icon }) => (
              <button key={key} type="button" onClick={() => navigate(key)} aria-current={section === key ? "page" : undefined} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${section === key ? "bg-foreground text-white" : "text-foreground/60 hover:bg-surface"}`}>
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
          {error && (
            <div role="alert" className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">
              <AlertIcon className="h-5 w-5" />
              <p className="flex-1">Couldn&apos;t refresh: {error}</p>
              <button type="button" onClick={() => void load()} className="font-semibold underline underline-offset-4">Retry</button>
            </div>
          )}
          <div key={section} className="animate-fade-up">
            {section === "overview" && <OverviewPanel data={data} refresh={load} displayName={displayName} navigate={navigate} />}
            {section === "calendar" && <AppointmentsPanel data={data} refresh={load} />}
            {section === "customers" && <CustomersPanel data={data} refresh={load} />}
            {section === "treatments" && <TreatmentsPanel treatments={data.treatments} refresh={load} />}
            {section === "availability" && <AvailabilityPanel data={data} refresh={load} />}
            {section === "website" && <WebsitePanel data={data} refresh={load} />}
          </div>
        </main>
      </div>
    </div>
  );
}
