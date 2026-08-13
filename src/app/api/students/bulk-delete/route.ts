import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || !ids.length) return error("ids required");

    const where: any = {
      id: { in: ids },
      role: Role.STUDENT,
    };
    if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
      where.collegeId = auth.session!.user.collegeId;
    }

    // Soft-deactivate safer than hard delete (preserves history)
    const result = await prisma.user.updateMany({
      where,
      data: { isActive: false },
    });
    return json({ deleted: result.count, mode: "deactivated" });
  } catch (e: any) {
    return error(e.message || "Bulk delete failed", 500);
  }
}
