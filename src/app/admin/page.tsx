import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/auth/authorization";

export const instant = false;

export default async function AdminPage() {
  await requirePageUser();
  redirect("/admin/tasks");
}
