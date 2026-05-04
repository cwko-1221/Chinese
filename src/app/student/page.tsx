import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import StudentDashboard from "@/components/StudentDashboard";

export const metadata = { title: "學生首頁" };

export default async function StudentPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/teacher");
  return <StudentDashboard user={user} />;
}
