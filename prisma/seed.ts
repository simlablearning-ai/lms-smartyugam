import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.answer.deleteMany();
  await prisma.testAttempt.deleteMany();
  await prisma.testQuestion.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.test.deleteMany();
  await prisma.question.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.college.deleteMany();

  const password = await hash("password123", 12);

  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@smartyugam.com",
      password,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
    },
  });

  // Colleges
  const college1 = await prisma.college.create({
    data: {
      name: "SmartYugam Institute of Technology",
      code: "SYIT",
      address: "123 Education Park",
      city: "Bengaluru",
      state: "Karnataka",
      logoUrl: "https://lms.smartyugam.com/logo.png",
    },
  });

  const college2 = await prisma.college.create({
    data: {
      name: "Global Engineering College",
      code: "GEC",
      address: "456 Knowledge Avenue",
      city: "Pune",
      state: "Maharashtra",
    },
  });

  // Departments
  const cse = await prisma.department.create({
    data: {
      name: "Computer Science & Engineering",
      code: "CSE",
      collegeId: college1.id,
    },
  });

  const ece = await prisma.department.create({
    data: {
      name: "Electronics & Communication",
      code: "ECE",
      collegeId: college1.id,
    },
  });

  const mech = await prisma.department.create({
    data: {
      name: "Mechanical Engineering",
      code: "MECH",
      collegeId: college2.id,
    },
  });

  // College Admins
  const collegeAdmin1 = await prisma.user.create({
    data: {
      email: "admin@syit.edu",
      password,
      name: "Dr. Priya Sharma",
      role: Role.COLLEGE_ADMIN,
      collegeId: college1.id,
    },
  });

  const collegeAdmin2 = await prisma.user.create({
    data: {
      email: "admin@gec.edu",
      password,
      name: "Prof. Rajesh Kumar",
      role: Role.COLLEGE_ADMIN,
      collegeId: college2.id,
    },
  });

  // Students
  const student1 = await prisma.user.create({
    data: {
      email: "student1@syit.edu",
      password,
      name: "Aarav Patel",
      role: Role.STUDENT,
      rollNumber: "SYIT/CSE/21/001",
      collegeId: college1.id,
      departmentId: cse.id,
      year: 3,
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: "student2@syit.edu",
      password,
      name: "Ananya Reddy",
      role: Role.STUDENT,
      rollNumber: "SYIT/CSE/21/002",
      collegeId: college1.id,
      departmentId: cse.id,
      year: 2,
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: "student3@gec.edu",
      password,
      rollNumber: "GEC/ME/20/015",
      name: "Rohan Mehta",
      role: Role.STUDENT,
      collegeId: college2.id,
      departmentId: mech.id,
      year: 4,
    },
  });

  // Courses
  const course1 = await prisma.course.create({
    data: {
      title: "Data Structures & Algorithms",
      description: "Core DSA concepts for placement and competitive programming",
      code: "CSE301",
      collegeId: college1.id,
      departmentId: cse.id,
      createdById: collegeAdmin1.id,
      passingScore: 50,
    },
  });

  const course2 = await prisma.course.create({
    data: {
      title: "Web Development with React",
      description: "Modern full-stack web development",
      code: "CSE401",
      collegeId: college1.id,
      departmentId: cse.id,
      createdById: collegeAdmin1.id,
      passingScore: 40,
    },
  });

  // Questions
  const q1 = await prisma.question.create({
    data: {
      text: "What is the time complexity of binary search?",
      type: "MCQ",
      options: JSON.stringify([
        "O(n)",
        "O(log n)",
        "O(n log n)",
        "O(1)",
      ]),
      correctAnswer: "O(log n)",
      difficulty: 2,
      marks: 2,
      collegeId: college1.id,
      departmentId: cse.id,
      createdById: collegeAdmin1.id,
    },
  });

  const q2 = await prisma.question.create({
    data: {
      text: "Which data structure uses LIFO principle?",
      type: "MCQ",
      options: JSON.stringify(["Queue", "Stack", "Tree", "Graph"]),
      correctAnswer: "Stack",
      difficulty: 1,
      marks: 1,
      collegeId: college1.id,
      departmentId: cse.id,
      createdById: collegeAdmin1.id,
    },
  });

  const q3 = await prisma.question.create({
    data: {
      text: "React is a JavaScript library for building user interfaces.",
      type: "TRUE_FALSE",
      options: JSON.stringify(["True", "False"]),
      correctAnswer: "True",
      difficulty: 1,
      marks: 1,
      collegeId: college1.id,
      departmentId: cse.id,
      createdById: collegeAdmin1.id,
    },
  });

  // Tests
  const test1 = await prisma.test.create({
    data: {
      title: "DSA Mid-Term Assessment",
      description: "Proctored assessment covering arrays, linked lists, stacks & queues",
      courseId: course1.id,
      collegeId: college1.id,
      departmentId: cse.id,
      durationMinutes: 45,
      totalMarks: 20,
      passingMarks: 10,
      isProctored: true,
      status: "PUBLISHED",
      maxAttempts: 2,
      createdById: collegeAdmin1.id,
      questions: {
        create: [
          { questionId: q1.id, marks: 2, order: 1 },
          { questionId: q2.id, marks: 1, order: 2 },
        ],
      },
    },
  });

  const test2 = await prisma.test.create({
    data: {
      title: "React Fundamentals Quiz",
      description: "Quick check on React basics",
      courseId: course2.id,
      collegeId: college1.id,
      departmentId: cse.id,
      durationMinutes: 20,
      totalMarks: 10,
      passingMarks: 4,
      isProctored: true,
      status: "PUBLISHED",
      maxAttempts: 3,
      createdById: collegeAdmin1.id,
      questions: {
        create: [{ questionId: q3.id, marks: 1, order: 1 }],
      },
    },
  });

  // Enrollments
  await prisma.enrollment.createMany({
    data: [
      { studentId: student1.id, courseId: course1.id, progress: 65 },
      { studentId: student1.id, courseId: course2.id, progress: 40 },
      { studentId: student2.id, courseId: course1.id, progress: 30 },
    ],
  });

  console.log("✅ Seed completed successfully!");
  console.log("\n📋 Demo Credentials (password for all: password123)");
  console.log("─────────────────────────────────────────────────");
  console.log("Super Admin     : superadmin@smartyugam.com");
  console.log("College Admin 1 : admin@syit.edu");
  console.log("College Admin 2 : admin@gec.edu");
  console.log("Student 1       : student1@syit.edu");
  console.log("Student 2       : student2@syit.edu");
  console.log("Student 3       : student3@gec.edu");
  console.log("─────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
