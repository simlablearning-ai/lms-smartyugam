import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

export async function requireAuth(roles?: Role[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (roles && !roles.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

export function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
