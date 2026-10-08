# Feature: Image questions + Word bulk upload

**Branch:** `feature/image-questions-word-bulk`
**Safety:** Additive only — does not modify existing questions, tests, attempts, or reports.

## What is added

| Piece | Purpose |
|-------|---------|
| `Question.imageUrl` (nullable) | Diagram / figure for question body |
| `Question.optionImages` (nullable) | Optional images for options A–D |
| `POST /api/questions/bulk-word` | Import questions from `.docx` with embedded images |
| `WordBulkUpload` component | UI for Word upload on Question Bank |
| CSV/Excel bulk | **Unchanged** — still at `POST /api/questions/bulk` |

## 1. Schema change (required once)

In `prisma/schema.prisma` (and `lms-portal/prisma/schema.prisma` if both exist), inside `model Question`, after `marks`:

```prisma
  marks         Int          @default(1)
  imageUrl      String?      // optional diagram/image for question body
  optionImages  String?      // optional JSON array of option images
  collegeId     String?
```

Then:

```bash
npx prisma generate
npx prisma db push
```

This only **adds** nullable columns. No data loss.

## 2. Dependency

```bash
npm install
```

(`jszip` is in package.json.)

## 3. UI wire-up (Super Admin Question Bank)

In bulk upload modal, add:

```tsx
import { WordBulkUpload } from "@/components/questions/WordBulkUpload";

<WordBulkUpload
  banks={banks}
  collegeId={collegeFilter || undefined}
  onDone={() => load()}
/>
```

Keep existing CSV/Excel controls.

## 4. Student test UI (show image)

Where question text is rendered:

```tsx
{tq.question.imageUrl && (
  <img
    src={tq.question.imageUrl}
    alt="Question figure"
    className="mt-3 max-h-64 rounded-lg border border-slate-200 object-contain"
  />
)}
```

## 5. Word format for authors

```
Q1: [Type: MCQ] [Marks: 2] [Difficulty: 3]
Which number replaces the question mark?
[embed diagram image in Word]

A) 3
B) 7
C) 8
D) 9

Answer: B
```
