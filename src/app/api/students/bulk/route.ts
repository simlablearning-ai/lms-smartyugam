import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";

/**
 * Bulk create students.
 * Required: name, rollNumber (login username)
 * Optional: email, password (default 123456), collegeCode, departmentCode, year
 */
export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN, Role.COLLEGE_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const rows: any[] = Array.isArray(body.students)
      ? body.students
      : Array.isArray(body)
      ? body
      : [];

    if (!rows.length) {
      return error("No students provided. Send { students: [...] }");
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };
    const defaultPassword = await hash("123456", 12);

    const colleges = await prisma.college.findMany({ select: { id: true, code: true } });
    const departments = await prisma.department.findMany({
      select: { id: true, code: true, collegeId: true },
    });
    const collegeByCode = Object.fromEntries(
      colleges.map((c) => [c.code.toUpperCase(), c.id])
    );
    const deptByKey = Object.fromEntries(
      departments.map((d) => [`${d.collegeId}:${d.code.toUpperCase()}`, d.id])
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row.name || row.Name || "").toString().trim();
      const rollRaw =
        row.rollNumber ||
        row.RollNumber ||
        row.roll ||
        row.Roll ||
        row["Roll Number"] ||
        row["roll number"];
      const roll = rollRaw != null ? String(rollRaw).trim() : "";
      const emailRaw = (row.email || row.Email || "").toString().trim().toLowerCase();
      const emailVal = emailRaw || null;

      if (!name || !roll) {
        results.errors.push(`Row ${i + 1}: name and rollNumber required`);
        results.skipped++;
        continue;
      }

      let collegeId = row.collegeId || row.college_id || null;
      const collegeCode = (
        row.collegeCode ||
        row.college_code ||
        row.CollegeCode ||
        ""
      )
        .toString()
        .toUpperCase();
      if (!collegeId && collegeCode) collegeId = collegeByCode[collegeCode] || null;

      if (auth.session!.user.role === Role.COLLEGE_ADMIN) {
        collegeId = auth.session!.user.collegeId;
      }

      if (!collegeId) {
        results.errors.push(`Row ${i + 1} (${roll}): college required`);
        results.skipped++;
        continue;
      }

      let departmentId = row.departmentId || row.department_id || null;
      const deptCode = (
        row.departmentCode ||
        row.department_code ||
        row.DepartmentCode ||
        ""
      )
        .toString()
        .toUpperCase();
      if (!departmentId && deptCode) {
        departmentId = deptByKey[`${collegeId}:${deptCode}`] || null;
      }

      const yearRaw = row.year || row.Year;
      const year =
        yearRaw != null && yearRaw !== "" ? parseInt(String(yearRaw), 10) : null;

      const existingRoll = await prisma.user.findFirst({
        where: { rollNumber: { equals: roll, mode: "insensitive" } },
      });
      if (existingRoll) {
        results.errors.push(`Row ${i + 1} (${roll}): roll number already exists`);
        results.skipped++;
        continue;
      }

      if (emailVal) {
        const existingEmail = await prisma.user.findUnique({ where: { email: emailVal } });
        if (existingEmail) {
          results.errors.push(`Row ${i + 1} (${emailVal}): email already exists`);
          results.skipped++;
          continue;
        }
      }

      const pwd = row.password
        ? await hash(String(row.password), 12)
        : defaultPassword;

      try {
        await prisma.user.create({
          data: {
            name,
            email: emailVal,
            password: pwd,
            role: Role.STUDENT,
            collegeId,
            departmentId: departmentId || null,
            year: Number.isFinite(year) ? year : null,
            rollNumber: roll,
          },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push(`Row ${i + 1} (${roll}): ${e.message}`);
        results.skipped++;
      }
    }

    return json(results, 201);
  } catch (e: any) {
    return error(e.message || "Bulk upload failed", 500);
  }
}
