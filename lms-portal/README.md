# SmartYugam LMS Portal

Multi-tenant Learning Management System with three role-based dashboards:

- **Super Admin** – Manage colleges, departments, students, courses, question banks, tests, reports
- **College Admin** – Manage their own college’s departments, students, courses, questions, tests & reports
- **Student** – Take proctored tests, view learning path & skill level, download certificates

## Features

- Modern SaaS-style responsive UI (mobile-first)
- Email/password authentication with JWT sessions
- Multi-tenant architecture (one Super Admin → many independent colleges)
- Full data model for Colleges, Departments, Students, Courses, Questions, Tests
- Proctored assessments (Fullscreen + tab/focus loss detection – Phase 1)
- Auto-calculated Learning Path & Skill Level from test scores
- Certificate records ready for PDF generation after passing a course
- Filtering support (by college, department, student, year, test…)
- Demo seed data included

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | Next.js 16 (App Router) + TypeScript |
| UI           | Tailwind CSS v4 + Lucide icons      |
| Auth         | NextAuth.js (Credentials)           |
| Database     | Prisma + PostgreSQL (Neon recommended) |
| Validation   | Zod                                 |

## Quick Start (Local + Neon)

1. Create a free database at [https://neon.tech](https://neon.tech)
2. Copy the connection string
3. Put it in `.env` as `DATABASE_URL`

```bash
# 1. Install dependencies
cd lms-portal
npm install

# 2. Generate Prisma client & create tables on Neon
npx prisma generate
npx prisma db push

# 3. Seed demo data
npx tsx prisma/seed.ts

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Deploy to Vercel
See the deployment guide. Main environment variables needed on Vercel:
- `DATABASE_URL` → your Neon connection string
- `NEXTAUTH_SECRET` → any long random string
- `NEXTAUTH_URL` → your Vercel URL (https://your-app.vercel.app)

## Demo Credentials

Fresh install: only Super Admin — **`password123`**

| Role           | Email                      |
|----------------|----------------------------|
| Super Admin    | superadmin@smartyugam.com  |
| College Admin  | admin@syit.edu             |
| College Admin  | admin@gec.edu              |
| Student        | student1@syit.edu          |
| Student        | student2@syit.edu          |
| Student        | student3@gec.edu           |

## Project Structure

```
lms-portal/
├── prisma/
│   ├── schema.prisma      # Full data model
│   └── seed.ts            # Demo data
├── src/
│   ├── app/
│   │   ├── (auth)/login/  # Login page
│   │   ├── (dashboard)/
│   │   │   ├── super-admin/
│   │   │   ├── college-admin/
│   │   │   └── student/
│   │   └── api/auth/      # NextAuth routes
│   ├── components/
│   │   ├── layout/        # DashboardShell (sidebar + topbar)
│   │   └── Providers.tsx
│   ├── lib/
│   │   ├── auth.ts        # NextAuth config + roles
│   │   ├── prisma.ts
│   │   └── utils.ts
│   └── middleware.ts      # Protects dashboard routes
├── .env
└── package.json
```

## Database Schema Overview

- **User** – role (SUPER_ADMIN | COLLEGE_ADMIN | STUDENT), linked to College & Department
- **College** – multi-tenant root
- **Department** – belongs to one College
- **Course** – optional college/department scope
- **Question** – MCQ / True-False / Short Answer + Question Bank per college
- **Test** – proctored flag, duration, marks, max attempts
- **TestAttempt** – score, violations JSON, status
- **Certificate** – ready for auto-issue on course pass
- **Enrollment** – progress tracking for learning path

## Proctoring (Phase 1)

Client-side enforcement only:

- Forces Fullscreen mode
- Detects visibilitychange / blur / tab switch
- Logs violations into TestAttempt.violations
- No camera / screen recording yet (can be added later)

## Certificates

When a student reaches the course passing score, a certificate record can be created with a unique number.  
PDF generation can be added later using @react-pdf/renderer or pdfkit.

## Fixes & New Features (Aug 2026)

### Bug fixes
- Fixed response body double-read (`await res.json()` called twice) which emptied College / Department dropdowns on Courses, Questions, Tests and several College-Admin pages. Data now loads correctly and syncs across dashboards.

### New capabilities
- **Bulk student upload** – Super Admin Students page: CSV / JSON upload with template download. Columns: `name,email,password,collegeCode,departmentCode,year`. API: `POST /api/students/bulk`
- **Question Banks + bulk questions** – Create a named Question Bank and bulk-upload questions (CSV/JSON). Banks can be reused across colleges for tests. APIs: `/api/question-banks`, `POST /api/questions/bulk`
- **Report CSV export** – Reports page filters (college, department, year, test) + **Download CSV**. API: `GET /api/reports/export`

### After pull
```bash
npx prisma generate
npx prisma db push   # adds QuestionBank model + questionBankId on Question
npm run dev
```

## Current Status

**Foundation complete:**
- Full Prisma schema (incl. QuestionBank)
- Auth with 3 roles + protected routes
- Login page (branded with SmartYugam logo)
- Super Admin, College Admin & Student dashboards
- Full CRUD for Colleges, Departments, Students, Courses, Questions, Tests
- Bulk student & question upload
- Reports with filters + CSV export
- Proctored test taking
- Seed data with 2 colleges, departments, students, courses, questions & tests
- Responsive DashboardShell with sidebar navigation

## Logo

Uses: https://lms.smartyugam.com/logo.png

---

Built for SmartYugam LMS Portal · 2026
