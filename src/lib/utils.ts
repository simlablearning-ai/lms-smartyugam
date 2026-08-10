import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateCertificateNumber(collegeCode: string, year: number) {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `${collegeCode}-${year}-${random}`;
}

export function calculateSkillLevel(percentage: number): {
  level: string;
  color: string;
  progress: number;
} {
  if (percentage >= 90)
    return { level: "Expert", color: "bg-emerald-500", progress: 100 };
  if (percentage >= 75)
    return { level: "Advanced", color: "bg-blue-500", progress: 85 };
  if (percentage >= 60)
    return { level: "Intermediate", color: "bg-amber-500", progress: 70 };
  if (percentage >= 40)
    return { level: "Beginner", color: "bg-orange-500", progress: 50 };
  return { level: "Novice", color: "bg-rose-500", progress: 25 };
}
