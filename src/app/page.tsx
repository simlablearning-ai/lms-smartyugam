import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "SUPER_ADMIN") {
    redirect("/super-admin");
  }
  if (session.user.role === "COLLEGE_ADMIN") {
    redirect("/college-admin");
  }
  redirect("/student");
}
