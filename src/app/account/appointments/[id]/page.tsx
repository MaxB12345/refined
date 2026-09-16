import { redirect } from "next/navigation";

import { CustomerAppointmentDetail } from "@/components/customer-appointment-detail";
import { getAuthClaims } from "@/lib/auth";

export default async function CustomerAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const claims = await getAuthClaims();
  if (!claims) redirect("/account/login");

  const { id } = await params;
  return <CustomerAppointmentDetail appointmentId={id} />;
}
