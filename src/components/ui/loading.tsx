export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-xl ${className}`} />;
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Announces a loading state to assistive tech while the skeleton stays decorative. */
export function LoadingRegion({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SlotSkeleton({ count = 6 }: { count?: number }) {
  return (
    <LoadingRegion label="Checking availability" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Array.from({ length: count }, (_, index) => <Skeleton key={index} className="h-11" />)}
    </LoadingRegion>
  );
}

export function AppointmentListSkeleton() {
  return (
    <LoadingRegion label="Loading your appointments" className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <section>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <Skeleton className="h-3 w-36" />
            <Skeleton className="mt-5 h-12 w-72 max-w-full" />
          </div>
          <Skeleton className="h-10 w-48 rounded-full" />
        </div>
        <div className="mt-8 space-y-4">
          {[0, 1].map((item) => (
            <div key={item} className="rounded-[1.5rem] border border-line bg-white p-6 sm:p-7">
              <Skeleton className="h-8 w-56 max-w-full" />
              <Skeleton className="mt-4 h-4 w-64 max-w-full" />
              <Skeleton className="mt-2 h-4 w-44" />
              <div className="mt-6 flex gap-3 border-t border-line pt-5">
                <Skeleton className="h-10 w-28 rounded-full" />
                <Skeleton className="h-10 w-40 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="h-fit rounded-[1.5rem] bg-surface p-6 sm:p-7">
        <Skeleton className="h-3 w-24 bg-white/70" />
        <div className="mt-6 space-y-5">
          {[0, 1, 2].map((item) => (
            <div key={item}>
              <Skeleton className="h-3 w-20 bg-white/70" />
              <Skeleton className="mt-2 h-11 bg-white/70" />
            </div>
          ))}
          <Skeleton className="h-11 rounded-full bg-white/70" />
        </div>
      </aside>
    </LoadingRegion>
  );
}

export function AppointmentDetailSkeleton() {
  return (
    <LoadingRegion label="Loading appointment" className="mx-auto min-h-screen max-w-3xl px-6 py-16 sm:px-10">
      <Skeleton className="h-4 w-40" />
      <div className="mt-8 rounded-[2rem] border border-line bg-white p-7 sm:p-10">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-6 h-12 w-80 max-w-full" />
        <div className="mt-8 grid gap-6 border-y border-line py-7 sm:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-3 h-4 w-48" />
              <Skeleton className="mt-2 h-4 w-32" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-8 h-3 w-24" />
        <Skeleton className="mt-4 h-8 w-56" />
        <Skeleton className="mt-6 h-12 w-72 max-w-full" />
      </div>
    </LoadingRegion>
  );
}

export function ConfirmationSkeleton() {
  return (
    <LoadingRegion label="Loading your confirmation" className="flex min-h-screen items-center justify-center px-6 py-16 sm:px-10">
      <section className="w-full max-w-2xl rounded-[2rem] border border-line bg-surface p-7 sm:p-12">
        <Skeleton className="h-14 w-14 rounded-full bg-white/70" />
        <Skeleton className="mt-8 h-3 w-44 bg-white/70" />
        <Skeleton className="mt-6 h-12 w-full max-w-md bg-white/70" />
        <Skeleton className="mt-3 h-12 w-2/3 bg-white/70" />
        <Skeleton className="mt-6 h-4 w-full max-w-lg bg-white/70" />
        <div className="mt-10 grid gap-5 border-y border-line py-7 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item}>
              <Skeleton className="h-3 w-20 bg-white/70" />
              <Skeleton className="mt-3 h-5 w-40 bg-white/70" />
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-12 w-52 rounded-full bg-white/70" />
          <Skeleton className="h-12 w-36 rounded-full bg-white/70" />
        </div>
      </section>
    </LoadingRegion>
  );
}
