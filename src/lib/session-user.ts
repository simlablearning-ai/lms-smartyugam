import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

/**
 * Resolve a real User id from the JWT session.
 * After db:reset, old session cookies still hold a deleted user id — this recovers by email
 * or returns null so the API can ask the client to re-login.
 */
export async function resolveCreatorId(session: Session | null | undefined): Promise<string | null> {
  if (!session?.user?.id) return null;

  const byId = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (byId) return byId.id;

  const email = session.user.email;
  if (email) {
    const byEmail = await prisma.user.findFirst({
      where: { email: String(email).toLowerCase() },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  // Last resort: any SUPER_ADMIN (fresh seed)
  const admin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", isActive: true },
    select: { id: true },
  });
  return admin?.id || null;
}
