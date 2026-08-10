import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { notifyUser } from "@/lib/notify";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    const body = await req.json();
    const { status, score, adminNotes, interviewRound, interviewAt, interviewInfo } = body;

    const existing = await prisma.jobApplication.findUnique({
      where: { id },
      include: { student: { select: { collegeId: true } } },
    });
    if (!existing) return error("Application not found", 404);

    if (
      auth.session!.user.role === Role.COLLEGE_ADMIN &&
      existing.student.collegeId !== auth.session!.user.collegeId
    ) {
      return error("Forbidden", 403);
    }

    // College admin cannot change to SELECTED beyond viewing — allow shortlist notes only for super
    if (auth.session!.user.role === Role.COLLEGE_ADMIN && status === "SELECTED") {
      return error("Only Super Admin can mark as Selected/Placed");
    }

    const app = await prisma.jobApplication.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(score !== undefined && { score: score != null ? parseFloat(score) : null }),
        ...(adminNotes !== undefined && { adminNotes }),
        ...(interviewRound !== undefined && { interviewRound }),
        ...(interviewAt !== undefined && {
          interviewAt: interviewAt ? new Date(interviewAt) : null,
        }),
        ...(interviewInfo !== undefined && { interviewInfo }),
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
        job: { select: { id: true, title: true, companyName: true } },
      },
    });

    // Notify student of status / interview updates
    try {
      const statusLabel = app.status;
      let title = `Application update: ${app.job.companyName}`;
      let body = `Your application for "${app.job.title}" is now: ${statusLabel}.`;
      if (app.status === "INTERVIEW") {
        title = `Interview scheduled: ${app.job.title}`;
        const when = app.interviewAt
          ? new Date(app.interviewAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
          : "TBA";
        body = `Round: ${app.interviewRound || "Interview"}. When: ${when} IST. ${app.interviewInfo || ""}`.trim();
      } else if (app.status === "SHORTLISTED") {
        title = `Shortlisted: ${app.job.title}`;
        body = `You have been shortlisted for ${app.job.companyName} — ${app.job.title}.`;
      } else if (app.status === "SELECTED") {
        title = `Selected: ${app.job.title}`;
        body = `Congratulations! You were selected for ${app.job.companyName} — ${app.job.title}.`;
      } else if (app.status === "REJECTED") {
        title = `Update: ${app.job.title}`;
        body = `Your application for ${app.job.companyName} was not moved forward.`;
      }
      await notifyUser({
        userId: app.studentId,
        title,
        body,
        type: "APPLICATION",
        link: "/student/placement",
        meta: { applicationId: app.id, status: app.status },
      });
    } catch (err) {
      console.error("notify failed", err);
    }

    return json(app);
  } catch (e: any) {
    return error(e.message || "Update failed", 500);
  }
}
