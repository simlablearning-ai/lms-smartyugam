import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Fresh LMS seed — Super Admin only.
 * No demo colleges, students, tests, or sample data.
 */
async function main() {
  console.log("🌱 Seeding clean LMS (Super Admin only)...");

  // Wipe all application data (order matters for FKs)
  await prisma.answer.deleteMany().catch(() => {});
  await prisma.testAttempt.deleteMany().catch(() => {});
  await prisma.testQuestion.deleteMany().catch(() => {});
  await prisma.certificate.deleteMany().catch(() => {});
  await prisma.enrollment.deleteMany().catch(() => {});
  await prisma.moduleProgress.deleteMany().catch(() => {});
  await prisma.moduleContent.deleteMany().catch(() => {});
  await prisma.courseModule.deleteMany().catch(() => {});
  await prisma.jobApplication.deleteMany().catch(() => {});
  await prisma.placementBlock.deleteMany().catch(() => {});
  await prisma.jobPosting.deleteMany().catch(() => {});
  await prisma.placementProfile.deleteMany().catch(() => {});
  await prisma.notification.deleteMany().catch(() => {});
  await prisma.pushSubscription.deleteMany().catch(() => {});
  await prisma.passwordResetToken.deleteMany().catch(() => {});
  await prisma.test.deleteMany().catch(() => {});
  await prisma.question.deleteMany().catch(() => {});
  await prisma.questionBank.deleteMany().catch(() => {});
  await prisma.course.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});
  await prisma.department.deleteMany().catch(() => {});
  await prisma.college.deleteMany().catch(() => {});

  const password = await hash("password123", 12);

  await prisma.user.create({
    data: {
      email: "superadmin@smartyugam.com",
      password,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
    },
  });

  console.log("\n✅ Clean seed complete.");
  console.log("─────────────────────────────────");
  console.log("Super Admin login:");
  console.log("  Email   : superadmin@smartyugam.com");
  console.log("  Password: password123");
  console.log("─────────────────────────────────");
  console.log("No colleges, students, tests, or demo data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
