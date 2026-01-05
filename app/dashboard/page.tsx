import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboardclient";

export default async function DashboardPage() {
  const cookieStore = await cookies(); // ✅ IMPORTANT
  const token = cookieStore.get("erp_token")?.value;

  if (!token) redirect("/");

  return <DashboardClient />;
}
