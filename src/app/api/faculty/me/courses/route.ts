import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

/** Faculty: list only assigned courses */
export async function GET() {
  const auth = await requireAuth([Role.FACULTY]);
  if (auth.error) return auth.error;

  const rows = await prisma.facultyCourseAssignment.findMany({
    where: { facultyId: auth.session!.user.id },
    include: {
      course: {
        include: {
          college: { select: { id: true, name: true } },
          department: { select: { id: true, name: true } },
          _count: { select: { enrollments: true, materials: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return json(rows.map((r) => r.course).filter(Boolean));
}
