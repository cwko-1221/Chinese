import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import TeacherDashboard from "@/components/TeacherDashboard";

export const metadata = { title: "教師儀表板" };

export default async function TeacherPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "teacher") redirect("/student");
  return <TeacherDashboard user={user} />;
}
