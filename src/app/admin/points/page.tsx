import { redirect } from "next/navigation";

export default function LegacyPointsPage() {
  redirect("/admin/customers?section=points");
}
