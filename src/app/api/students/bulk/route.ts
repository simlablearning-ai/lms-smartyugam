import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";

/**
 * Bulk create students from CSV/JSON array.
 * Expected fields per row: name, email, password (optional), collegeCode or collegeId,
 * departmentCode (optional), year (optional)
 */
export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const rows: any[] = Array.isArray(body.students) ? body.students : Array.isArray(body) ? body : [];

    if (!rows.length) {
      return error("No students provided. Send { students: [...] } or a JSON array.");
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    const defaultPassword = await hash("password123", 12);

    // Pre-load colleges & departments for code lookup
    const colleges = await prisma.college.findMany({ select: { id: true, code: true } });
    const departments = await prisma.department.findMany({
      select: { id: true, code: true, collegeId: true },
    });
    const collegeByCode = Object.fromEntries(colleges.map((c) => [c.code.toUpperCase(), c.id]));
    const deptByKey = Object.fromEntries(
      departments.map((d) => [`${d.collegeId}:${d.code.toUpperCase()}`, d.id])
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name || row.Name || "").toString().trim();
      const email = (row.email || row.Email || "").toString().trim().toLowerCase();
      if (!name || !email) {
        results.errors.push(`Row ${i + 1}: name and email required`);
        results.skipped++;
        continue;
      }

      let collegeId = row.collegeId || row.college_id || null;
      const collegeCode = (row.collegeCode || row.college_code || row.CollegeCode || "").toString().toUpperCase();
      if (!collegeId && collegeCode) collegeId = collegeByCode[collegeCode] || null;

      if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
        collegeId = auth.session!.user.collegeId;
      }

      if (!collegeId) {
        results.errors.push(`Row ${i + 1} (${email}): college required`);
        results.skipped++;
        continue;
      }

      let departmentId = row.departmentId || row.department_id || null;
      const deptCode = (row.departmentCode || row.department_code || row.DepartmentCode || "").toString().toUpperCase();
      if (!departmentId && deptCode) {
        departmentId = deptByKey[`${collegeId}:${deptCode}`] || null;
      }

      const yearRaw = row.year || row.Year;
      const year = yearRaw != null && yearRaw !== "" ? parseInt(String(yearRaw), 10) : null;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        results.errors.push(`Row ${i + 1} (${email}): already exists`);
        results.skipped++;
        continue;
      }

      const pwd = row.password ? await hash(String(row.password), 12) : defaultPassword;

      try {
        await prisma.user.create({
          data: {
            name,
            email,
            password: pwd,
            role: Role.STUDENT,
            collegeId,
            departmentId: departmentId || null,
            year: Number.isFinite(year) ? year : null,
          },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push(`Row ${i + 1} (${email}): ${e.message}`);
        results.skipped++;
      }
    }

    return json(results, 201);
  } catch (e: any) {
    return error(e.message || "Bulk upload failed", 500);
  }
}
