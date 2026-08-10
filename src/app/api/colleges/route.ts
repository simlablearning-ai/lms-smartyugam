import { prisma } from "@/lib/prisma";
import { requireAuth, json, error } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";

export async function GET() {
  const auth = await requireAuth([Role.SUPER_ADMIN]);
  if (auth.error) return auth.error;

  const colleges = await prisma.college.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true, departments: true, courses: true },
      },
      users: {
        where: { role: Role.COLLEGE_ADMIN, isActive: true },
        select: { id: true, name: true, email: true },
        take: 5,
      },
    },
  });

  return json(colleges);
}

export async function POST(req: Request) {
  const auth = await requireAuth([Role.SUPER_ADMIN]);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const {
      name,
      code,
      address,
      city,
      state,
      logoUrl,
      adminName,
      adminEmail,
      adminPassword,
    } = body;

    if (!name || !code) {
      return error("Name and Code are required");
    }

    const existing = await prisma.college.findUnique({ where: { code } });
    if (existing) {
      return error("College code already exists");
    }

    // Optional but recommended: create College Admin with the college
    let adminUser = null;
    if (adminEmail || adminPassword || adminName) {
      if (!adminEmail || !adminPassword || !adminName) {
        return error(
          "College Admin requires name, email, and password (or leave all three empty)"
        );
      }
      if (String(adminPassword).length < 6) {
        return error("Admin password must be at least 6 characters");
      }
      const emailTaken = await prisma.user.findUnique({
        where: { email: adminEmail.toLowerCase().trim() },
      });
      if (emailTaken) {
        return error("Admin email is already registered");
      }
    }

    const college = await prisma.college.create({
      data: {
        name,
        code: code.toUpperCase().trim(),
        address: address || null,
        city: city || null,
        state: state || null,
        logoUrl: logoUrl || null,
      },
    });

    if (adminEmail && adminPassword && adminName) {
      const hashed = await hash(String(adminPassword), 12);
      adminUser = await prisma.user.create({
        data: {
          name: adminName.trim(),
          email: adminEmail.toLowerCase().trim(),
          password: hashed,
          role: Role.COLLEGE_ADMIN,
          collegeId: college.id,
          isActive: true,
        },
        select: { id: true, name: true, email: true, role: true },
      });
    }

    return json(
      {
        ...college,
        admin: adminUser,
      },
      201
    );
  } catch (e: any) {
    return error(e.message || "Failed to create college", 500);
  }
}
