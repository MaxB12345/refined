import { LoadingRegion, Skeleton } from "@/components/ui/loading";

/** Mirrors the admin shell so the page doesn't jump when data arrives. */
export function AdminSkeleton() {
  return (
    <LoadingRegion label="Loading your admin workspace" className="min-h-screen bg-canvas lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden h-screen flex-col border-r border-line bg-white lg:flex">
        <div className="px-6 pb-6 pt-7">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="ml-5 mt-2 h-2.5 w-24" />
        </div>
        <div className="space-y-2 px-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-2">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </div>
      </aside>
      <div>
        <div className="border-b border-line bg-white px-4 py-3 lg:hidden">
          <Skeleton className="h-5 w-24" />
          <div className="mt-4 flex gap-2">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-8 w-24 rounded-full" />)}</div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="mt-3 h-10 w-72 max-w-full" />
          <Skeleton className="mt-3 h-4 w-60" />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="rounded-2xl border border-line bg-white p-5">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="mt-4 h-9 w-16" />
                <Skeleton className="mt-3 h-3 w-24" />
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            {[4, 3].map((rows, card) => (
              <div key={card} className="rounded-2xl border border-line bg-white">
                <div className="border-b border-line px-6 py-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
                <div className="space-y-5 p-6">
                  {Array.from({ length: rows }, (_, index) => (
                    <div key={index} className="flex gap-4">
                      <Skeleton className="h-9 w-12" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-40 max-w-full" />
                        <Skeleton className="mt-2 h-3 w-56 max-w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}
