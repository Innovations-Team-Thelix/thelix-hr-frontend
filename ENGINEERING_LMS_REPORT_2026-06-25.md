# Engineering Report — LMS Module Implementation
**Date:** 2026-06-25  
**Project:** ThelixHRIS  
**Module:** Learning Management System (LMS)  
**Author:** Claude Code (AI Engineer)  
**Repos Affected:** `thelix-hr-frontend`, `thelix-hr-backend`  
**Branch:** `dev`

---

## Executive Summary

A full Learning Management System (LMS) was designed and implemented end-to-end in a single engineering session. The module ships as a self-contained sidebar section ("Learning") within the existing ThelixHRIS product and integrates with the existing 7-role RBAC model, notification system, audit logging, and S3 storage infrastructure.

Phase 1 (MVP) is complete and covers: course management, enrollment, lesson progress tracking, quiz engine, surveys, PDF certificate generation, gamification (badges + points + leaderboard), learning paths, manager team views, admin reporting, and a full frontend with Udemy/YouTube-style UI patterns.

---

## 1. Database Schema (`prisma/schema.prisma`)

### New Enums Added
| Enum | Values |
|------|--------|
| `CourseDifficulty` | Beginner, Intermediate, Advanced, Expert |
| `LessonContentType` | Video, PDF, Article, Audio, SCORM, LiveSession, Embed |
| `EnrollmentStatus` | NotStarted, InProgress, Completed, Dropped, Expired |
| `LmsQuestionType` | MultipleChoice, MultiSelect, TrueFalse, ShortAnswer, Matching, Ordering, FillInBlank |
| `LmsSurveyQuestionType` | StarRating, YesNo, LongAnswer, NPS, MultipleChoice |
| `LmsBadgeType` | CourseCompletion, LearningPath, StreakWeekly, StreakMonthly, TopLearner, FirstCourse, Assessment |
| `LmsPointActivity` | LessonComplete, CourseComplete, QuizPass, PathComplete, DailyLogin, SurveyComplete, BadgeEarned |

### New Models (23 total)
| Model | Purpose |
|-------|---------|
| `LmsCourseCategory` | Course taxonomy with name + hex color |
| `LmsCourse` | Core course record: title, difficulty, thumbnail, tags, mandatory flag |
| `LmsCourseModule` | Ordered module within a course |
| `LmsLesson` | Lesson with content type, S3 key, URL, body text, duration |
| `LmsEnrollment` | Employee ↔ course enrollment with status, progress %, due date; `@@unique([employeeId, courseId])` |
| `LmsLessonProgress` | Per-lesson completion + watch seconds; `@@unique([enrollmentId, lessonId])` |
| `LmsQuiz` | Quiz config: pass score, max attempts, time limit, shuffle flags |
| `LmsQuizQuestion` | Question with type, points, sort order |
| `LmsQuizOption` | Answer option with `isCorrect` flag |
| `LmsQuizAttempt` | Attempt record: score, isPassed, timeTaken |
| `LmsAttemptAnswer` | Per-question answer: selected IDs, text, isCorrect, pointsEarned |
| `LmsSurvey` | Course-level survey |
| `LmsSurveyQuestion` | Survey question with type |
| `LmsSurveyResponse` | One response per employee per survey; `@@unique([surveyId, employeeId])` |
| `LmsSurveyAnswer` | Rating, text, or boolean answer per question |
| `LmsCertificate` | Issued certificate with S3 key and UUID verify token; `@@unique([enrollmentId])` |
| `LmsPath` | Learning path with ordered course sequence and optional badge |
| `LmsPathCourse` | Course entry in a path with sort order; `@@unique([pathId, courseId])` |
| `LmsPathEnrollment` | Employee ↔ path enrollment with progress %; `@@unique([pathId, employeeId])` |
| `LmsBadge` | Badge definition with type and icon S3 key |
| `LmsUserBadge` | Employee badge award with source reference; `@@unique([employeeId, badgeId])` |
| `LmsPoints` | Running point totals per employee (total / weekly / monthly); `@@unique([employeeId])` |
| `LmsPointTransaction` | Immutable point event log per activity |

**Applied with:** `prisma db push --accept-data-loss` (migration history had drift from prior direct DB changes; push was used to avoid destructive reset).

---

## 2. Backend Module (`src/modules/lms/`)

### 2.1 `lms.service.ts`
- **Categories:** `listCategories`, `createCategory`, `updateCategory`, `deleteCategory`
- **Courses:** `listCourses` (with search/filter/pagination), `getCourse`, `createCourse`, `updateCourse`, `publishCourse`, `deleteCourse`
- **Modules:** `createModule`, `updateModule`, `deleteModule`, `reorderModules`
- **Lessons:** `createLesson`, `updateLesson`, `deleteLesson`
- **Enrollment:** `bulkEnroll` (resolves scope: `org` / `sbu:<id>` / `dept:<id>` / `individual` → employee IDs → `createMany(skipDuplicates)` → fires `LmsCourseAssigned` in-app + email notification per enrolment + audit log), `selfEnroll`
- **Progress:** `markLessonProgress` — upserts `LmsLessonProgress`, recalculates `enrollment.progressPct` (completed lessons ÷ total lessons × 100), auto-transitions enrollment status to `Completed` at 100%, triggers certificate generation + points award

### 2.2 `lms-quiz.service.ts`
- `startAttempt` — creates `LmsQuizAttempt`, enforces max attempts, enforces time limit
- `submitAttempt` — evaluates each answer against `LmsQuizOption.isCorrect`, computes total score percentage, sets `isPassed`, records per-question `LmsAttemptAnswer` rows, awards `QuizPass` points + `Assessment` badge on first pass, fires `LmsQuizPassed` / `LmsQuizFailed` notifications
- `getMyAttempts` — returns attempt history with answers

### 2.3 `lms-certificate.service.ts`
- Generates PDF certificate using `pdfkit`: employee full name, course title, completion date, verifying organisation name, unique verify token as QR-compatible URL
- Uploads to S3 under `lms/certificates/<employeeId>/` via existing `StorageService.uploadBuffer()`
- Stores `certificateKey` + `verifyToken` (UUID v4) on `LmsCertificate`
- Public `verifyCertificate(token)` — no auth required, returns certificate metadata for QR code scanning

### 2.4 `lms-survey.service.ts`
- `createSurvey`, `addQuestion`, `submitResponse` (one response per employee per survey, enforced at DB level), `getSurveyResponses` (admin aggregated view)

### 2.5 `lms-gamification.service.ts`
- `awardPoints(employeeId, activity, sourceId)` — upserts `LmsPoints`, creates `LmsPointTransaction`, fires `LmsBadgeEarned` notification
- `checkAndAwardBadge(employeeId, type, sourceId)` — idempotent badge grant
- `getLeaderboard(period)` — ranks employees by points for weekly / monthly / all-time periods
- `getMyBadges(employeeId)`, `getMyPoints(employeeId)`

### 2.6 `lms-path.service.ts`
- `listPaths`, `getPath`, `createPath`, `updatePath`, `deletePath`
- `enrollPath` (manager-assigned bulk enroll), `selfEnrollPath`
- `getPathProgress` — calculates per-course completion status and overall path progress %

### 2.7 `lms-reports.service.ts`
- `getEmployeeReport` — per-enrollment rows with employee info, course, progress %, status, certificate issue date
- `getDepartmentReport` — aggregated completion rate per department
- `getCourseReport` — per-course enrollment count, completion count, avg progress

### 2.8 `lms.controller.ts`
Thin controller layer (~50 methods) mapping route handlers to service functions with standard `req → service → res.json` pattern matching existing module conventions.

### 2.9 `lms.routes.ts`
```
Role constants:
  ALL  = ['CVO','Admin','SBUHead','Director','Manager','Finance','Employee']
  ADMIN = ['CVO','Admin']
  MGR   = ['CVO','Admin','SBUHead','Director','Manager']

Public (before authenticate middleware):
  GET  /lms/certificates/verify/:token

Authenticated routes (50+ endpoints):
  Categories, Courses, Modules, Lessons, Enrollment, Progress,
  Quiz, Survey, Certificates, Paths, Gamification, Team, Reports, Dashboard
```

**Critical fix:** `GET /lms/certificates/verify/:token` registered *before* `router.use(authenticate)` so QR code scanning works without a session.

### 2.9 `lms.validators.ts`
Zod schemas for all 20+ input types: course creation, lesson creation, bulk enrollment (scope validation), quiz submission, survey response, path creation/update, report filters.

### 2.10 `lms-reminders.cron.ts`
- Daily 08:00 — due-soon reminders (7 days out), marks overdue enrollments
- Weekly Monday — resets `LmsPoints.weekly`
- Monthly 1st — resets `LmsPoints.monthly`

### 2.11 `notification-types.ts` additions
```
LmsCourseAssigned, LmsCourseDueSoon, LmsCourseOverdue, LmsCourseCompleted,
LmsPathAssigned, LmsPathCompleted, LmsBadgeEarned, LmsCertificateIssued,
LmsQuizPassed, LmsQuizFailed
```

### 2.12 `server.ts`
```typescript
import lmsRoutes from './modules/lms/lms.routes';
app.use('/api/v1', apiLimiter, lmsRoutes);
```

---

## 3. Frontend — Navigation (`src/components/layout/sidebar.tsx`)

Added "Learning" collapsible sidebar section with 10 role-filtered children:

| Label | Route | Visible to |
|-------|-------|-----------|
| Dashboard | `/lms` | All roles |
| My Courses | `/lms/my-courses` | Employee, Finance, Manager+ |
| Course Library | `/lms/courses` | All roles |
| Course Builder | `/lms/courses/create` | CVO, Admin |
| Learning Paths | `/lms/paths` | All roles |
| Assessments | `/lms/assessments` | CVO, Admin |
| Certificates | `/lms/certificates` | All roles |
| Badges & Leaderboard | `/lms/gamification` | All roles |
| Team Progress | `/lms/team` | CVO, Admin, SBUHead, Director, Manager |
| Reports | `/lms/reports` | CVO, Admin, SBUHead |

Auto-expands when pathname starts with `/lms`.

---

## 4. Frontend — `AppLayout` Extension (`src/components/layout/app-layout.tsx`)

Added `fullWidth?: boolean` prop. When `true`, the main content area bypasses the `max-w-7xl` container constraint, enabling edge-to-edge layouts for pages like the course player.

---

## 5. Frontend — TanStack Query Hooks (`src/hooks/useLms.ts`)

35 hooks covering all API resource groups:

| Group | Hooks |
|-------|-------|
| Dashboard | `useMyLmsDashboard`, `useAdminLmsDashboard` |
| Categories | `useLmsCategories`, `useCreateLmsCategory`, `useDeleteLmsCategory` |
| Courses | `useLmsCourses`, `useLmsCourse`, `useCreateLmsCourse`, `useUpdateLmsCourse`, `usePublishLmsCourse`, `useDeleteLmsCourse` |
| Modules | `useCreateLmsModule`, `useUpdateLmsModule`, `useDeleteLmsModule` |
| Lessons | `useCreateLmsLesson`, `useDeleteLmsLesson` |
| Enrollment | `useMyEnrollments`, `useBulkEnroll`, `useSelfEnroll`, `useCourseEnrollments` |
| Progress | `useMarkLessonProgress`, `useCourseProgress` |
| Quiz | `useStartQuizAttempt`, `useSubmitQuizAttempt`, `useMyQuizAttempts` |
| Survey | `useCourseSurvey`, `useSubmitSurvey` |
| Certificates | `useMyCertificates` |
| Paths | `useLmsPaths`, `useLmsPath`, `useCreateLmsPath`, `useUpdateLmsPath`, `useDeleteLmsPath`, `useEnrollInPath`, `useSelfEnrollPath`, `useLmsPathProgress` |
| Gamification | `useLmsLeaderboard`, `useMyLmsBadges`, `useMyLmsPoints` |
| Team | `useLmsTeamProgress`, `useLmsTeamAtRisk` |
| Reports | `useLmsEmployeeReport`, `useLmsDepartmentReport`, `useLmsCourseReport` |

**Critical bug fixed during implementation:** All hooks initially used `.then(r => r.data.data)` — a double-unwrap caused by `api.ts` already returning `response.data` (the JSON body). All 31 occurrences corrected to `.then(r => r.data)`. Traced by cross-referencing with working hooks in `useEmployees.ts`.

---

## 6. Frontend — Pages (`src/app/lms/`)

### 6.1 LMS Dashboard (`page.tsx`)
**Employee view:**
- Time-based greeting banner with user first name from `useAuth().profile.fullName`
- 4 stat cards: courses enrolled, completed, certificates, streak
- "Continue Learning" section — Udemy-style progress cards with thumbnail, progress bar, difficulty badge, play/check icon
- Right column: SVG circular progress ring, badges earned grid, quick links

**Admin view:**
- 4 stat cards: total courses, total enrollments, completion rate, certificates issued
- Completion rate horizontal bar chart
- Recent enrollments table (employee + course + status + progress)
- Quick action buttons: Create Course, Create Path, View Reports

**Empty state:** CTA buttons linking to Course Library and paths when no data.

### 6.2 Course Library (`courses/page.tsx`)
- **Layout:** Responsive 4-column card grid (1 → 2 → 3 → 4 columns)
- **Thumbnail:** Gradient per category color, course initials, hover play button overlay, duration chip (bottom-right), status chip (top-left: Live/Draft for admin)
- **Filters:** Horizontal scrollable category pill bar with color dots; level button group; full-width search input
- **Card body:** Title (2-line clamp), category name, description (2-line clamp), difficulty badge, module count, enrollment count
- **Admin actions:** View / Edit / Publish toggle (eye icon) / Delete (trash icon)
- **Employee action:** Enroll Now button (full-width)
- **Empty state:** Contextual message based on whether filters are active

### 6.3 Course Detail (`courses/[courseId]/page.tsx`)
- **Layout:** `AppLayout fullWidth` — sticky top nav bar + video player area (left, ~70%) + curriculum sidebar (right, ~30%)
- **Video player** (`VideoPlayer` component):
  - YouTube embed (detects `youtube.com` / `youtu.be` URLs)
  - Vimeo embed (detects `vimeo.com` URLs)
  - Native HTML5 `<video>` for direct MP4/media URLs
  - `<iframe>` for Embed / LiveSession content types
  - PDF viewer via `<iframe>` (full height)
  - Article text renderer for `bodyText` content
  - Gradient placeholder with initials when no lesson selected
- **Lesson controls bar:** Previous / Mark Complete / Completed indicator / Next
- **Course info tabs:** Overview (description, tags, mandatory badge, quiz CTA) / Resources
- **Curriculum sidebar:** Progress bar header, module accordions with lesson list, per-lesson states (locked/active/done), Start First Lesson / Next Lesson / Course Complete CTAs
- **Assign modal:** Scope selector (org / individual), bulk enrollment

### 6.4 Course Builder (`courses/create/page.tsx`)
- Multi-field form: title, description, difficulty, estimated duration, tags (chip input)
- **Inline category creation:** `NewCategoryPopover` with 10 color swatches, create without leaving the page
- `CategorySelect`: dropdown + quick-select color pill buttons + `+` to open popover

### 6.5 Course Edit (`courses/[courseId]/edit/page.tsx`)
- Pre-populated via `useEffect` when course data loads
- Uses native `<select>` and `<label>` elements (project does not use shadcn `Select`)

### 6.6 My Courses (`my-courses/page.tsx`)
- Enrolled courses with progress bars, status badges (NotStarted / InProgress / Completed)
- Continue / Review CTAs; empty state linking to Course Library

### 6.7 Learning Paths List (`paths/page.tsx`)
- **Layout:** 3-column Udemy-style card grid
- **Thumbnail:** Rotating gradient palette (6 colors), path initials, hover play overlay, course count chip, Badge chip
- **Card body:** Title, description (2-line clamp), course flow preview (chips with chevron arrows), badge reward label, enrollment count
- **Admin actions:** View / Edit (pencil icon) / Delete (trash icon) / Enroll
- **Employee actions:** View Path / Enroll
- Delete triggers `ConfirmDialog` with danger variant

### 6.8 Learning Paths Create (`paths/create/page.tsx`)
- **Routing fix:** Next.js was matching `/lms/paths/create` against `[pathId]/page.tsx`. Resolved by creating a dedicated static route `paths/create/page.tsx` (Next.js App Router prefers static segments over dynamic ones).
- Course sequence builder: search-to-add picker dropdown, numbered ordered list, up/down reorder, remove (×)
- Disabled submit until title + ≥1 course present

### 6.9 Learning Path Edit (`paths/[pathId]/edit/page.tsx`)
- Pre-populates form from `useLmsPath(pathId)` via `useEffect`
- Same course sequence UI as create page
- Saves via `PUT /lms/paths/:id`

### 6.10 Learning Path Detail (`paths/[pathId]/page.tsx`)
- Sequential unlock flow: course N+1 locked until course N completed
- Visual connector line between course steps (check / circle / locked icons)
- Overall progress bar
- Self-enroll CTA if not enrolled; badge reward card if path has badge

### 6.11 Assessments (`assessments/page.tsx`)
- Lists all courses for admin quiz management
- "Manage Quiz →" link per course

### 6.12 Certificates (`certificates/page.tsx`)
- Grid of earned certificates with course name, issue date, expiry date
- Download PDF and Verify links

### 6.13 Gamification (`gamification/page.tsx`)
- Points summary cards: total / weekly / monthly
- Leaderboard with weekly / monthly / all-time period tabs
- Badge grid: earned (coloured) vs locked (greyscale with lock icon)

### 6.14 Team Progress (`team/page.tsx`)
- At-risk employees table (behind on mandatory courses)
- Team progress matrix

### 6.15 Reports (`reports/page.tsx`)
- 3-tab layout: Employee / Department / Course
- Employee tab: sortable table with progress bar, status pill, certificate date
- Department tab: completion rate cards with horizontal progress bars
- Course tab: table with enrollment count, completion count, completion rate bar, avg progress

---

## 7. Seed Scripts (`prisma/seeds/`)

### 7.1 `lms-categories.ts`
10 default categories seeded (idempotent — skips existing):

| Category | Color |
|----------|-------|
| Compliance & Policy | `#EF4444` |
| Health & Safety | `#F97316` |
| Leadership & Management | `#8B5CF6` |
| Human Resources | `#EC4899` |
| Information Technology | `#3B82F6` |
| Finance & Accounting | `#10B981` |
| Sales & Customer Service | `#F59E0B` |
| Operations | `#6366F1` |
| Communication & Soft Skills | `#14B8A6` |
| Onboarding | `#84CC16` |

### 7.2 `lms-paths.ts`
4 learning paths + 4 badges seeded:

| Path | Badge |
|------|-------|
| Cyber Security Fundamentals Path | Security Champion |
| New Employee Onboarding | Onboarding Star |
| Compliance & Policy Mastery | Compliance Hero |
| Leadership Essentials | *(no badge)* |

### 7.3 `lms-courses-with-videos.ts`
4 full courses created with real YouTube video lesson URLs and wired to their respective paths:

**Cyber Security Fundamentals** (3 modules, 6 lessons, 90 min)
- Module 1 — Introduction to Cyber Threats: What is Cybersecurity?, Common Cyber Threats
- Module 2 — Phishing & Social Engineering: How Phishing Attacks Work, Recognizing Social Engineering
- Module 3 — Password & Access Security: Creating Strong Passwords, Multi-Factor Authentication

**New Employee Orientation** (3 modules, 6 lessons, 75 min)
- Module 1 — Welcome to the Organisation: Mission & Values, First Week Expectations
- Module 2 — Workplace Policies & Conduct: Code of Conduct, HR Policies Every Employee Must Know
- Module 3 — IT & Tools Setup: Setting Up Your Workstation, Using Collaboration Tools

**Workplace Compliance & Regulatory Policy** (3 modules, 6 lessons, 100 min)
- Module 1 — Data Protection & Privacy: Introduction to GDPR, Handling Personal Data at Work
- Module 2 — Anti-Corruption & Ethics: Anti-Bribery Policy, Ethical Decision Making
- Module 3 — Health, Safety & Wellbeing: Workplace H&S Essentials, Mental Health Awareness

**Leadership & People Management** (3 modules, 6 lessons, 120 min)
- Module 1 — Foundations of Leadership: What Makes a Great Leader?, Leadership Styles
- Module 2 — Team Communication & Motivation: Effective Communication for Managers, Motivating Your Team
- Module 3 — Performance & Conflict Management: Managing Employee Performance, Resolving Workplace Conflicts

**Path → Course Wiring:**
| Path | Courses |
|------|---------|
| Cyber Security Fundamentals Path | Cyber Security Fundamentals |
| New Employee Onboarding | New Employee Orientation → Workplace Compliance |
| Compliance & Policy Mastery | Workplace Compliance → Cyber Security Fundamentals |
| Leadership Essentials | Leadership & People Management → Workplace Compliance |

---

## 8. Known Limitations / Phase 2 Scope

The following items are out of scope for Phase 1 and deferred to Phase 2:

- **SCORM support** — upload, unzip, `imsmanifest.xml` validation, iframe postMessage API
- **AI features** — quiz generation from lesson text, course outline builder, personalised recommendations
- **Social learning** — lesson comments, threaded Q&A, reactions
- **Live session scheduling** — `scheduledAt` field + 30-min-before cron reminder
- **Video upload to S3** — lesson content currently references external URLs; internal upload endpoint (`POST /lms/lessons/:id/upload`) is stubbed in routes but not implemented
- **Certificate PDF styling** — basic pdfkit layout; no branded template with logo/signature yet

---

## 9. Bug Fixes Applied During Implementation

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| All LMS API calls returned `undefined` | `api.ts` returns `response.data` (JSON body) already; hooks were doing `.then(r => r.data.data)` — one extra `.data` unwrap | Changed all 31 hook occurrences to `.then(r => r.data)` |
| LMS tables didn't exist after `migrate dev` | Migration history had drift from direct DB changes; `migrate dev` wanted to reset | Used `prisma db push --accept-data-loss` instead |
| Backend used stale Prisma client after `db push` | `tsx watch` doesn't reload `node_modules` — Prisma client regeneration happens there | Killed the child process; `tsx watch` relaunched it with the new client |
| Certificate verify route returned 401 | Route was registered after `router.use(authenticate)` | Moved to before the authenticate middleware |
| `/lms/paths/create` showed "Path not found" | Next.js App Router matched "create" as `[pathId]` dynamic segment | Created dedicated `paths/create/page.tsx` — static segments take priority |
| Categories dropdown showed empty in Course Builder | Same double-unwrap bug as hooks (`.data.data`) | Fixed in categories hook |

---

*Report generated: 2026-06-25*  
*Next session should begin with Phase 2 scoping: SCORM, AI quiz generation, and video upload to S3.*
