import { BookingConfirmation } from "@/components/booking-confirmation";

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <BookingConfirmation token={token} />;
}
