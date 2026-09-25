import { requireAdmin } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin-dashboard";

export default async function AdminPage() {
  const { admin } = await requireAdmin();

  return <AdminDashboard displayName={admin.display_name} />;
}
