import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import PracticeFlow from "@/components/PracticeFlow";

type Params = Promise<{ assignmentId: string }>;

export default async function PracticePage({ params }: { params: Params }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/teacher");
  const { assignmentId } = await params;
  return <PracticeFlow assignmentId={assignmentId} user={user} />;
}
