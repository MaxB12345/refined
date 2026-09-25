import { AppointmentListSkeleton } from "@/components/ui/loading";

export default function AccountLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 sm:px-10 lg:px-12">
      <AppointmentListSkeleton />
    </main>
  );
}
