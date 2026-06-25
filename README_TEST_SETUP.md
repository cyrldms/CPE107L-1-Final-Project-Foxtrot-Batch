# README — Test Environment Setup (PRE-REVISION SAFE MODE)

> **Scope**: Syllabus module only.  
> **Mode**: Read-only codebase — nothing in `models/`, `routes/`, `views/`, or `public/` is modified.  
> **Goal**: Minimum viable data to login, load dashboards, and navigate Steps 1→2→3→Preview.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18 (ESM support) |
| MongoDB | Running locally or Atlas connection string |
| npm packages installed | `npm install` already run |

---

## Step 1 — Configure `.env`

Create a `.env` file in the project root (same folder as `index.js`):

```env
MONGO_URI=mongodb://127.0.0.1:27017
SESSION_SECRET=dev-secret-change-in-prod
PORT=3000
```

> ⚠️ **Atlas users**: Replace with your Atlas connection string:
> ```
> MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net
> ```
> The database name (`mainDB`) is appended automatically by the app — do **not** include it in the URI.

A template is also provided at [`.env.example`](./.env.example).

---

## Step 2 — Run the Seed Script

```bash
node seed.js
```

Expected output:
```
✅  Connected to mainDB

📦  Seeding users...
  ✅  Created user: egrequillo@mcm.edu.ph  [Professor]
  ✅  Created user: mbtabanao@mcm.edu.ph   [Program-Chair]
  ✅  Created user: mgcalamba@mcm.edu.ph   [Dean]
  ✅  Created user: vpaa_test@mcm.edu.ph   [HR]
  ✅  Created user: testadmin@mcm.edu.ph   [Admin]
  ✅  Created user: testhr@mcm.edu.ph      [HR]

📦  Seeding 1 syllabus for egrequillo...
  ✅  Syllabus created: CPE107L-1 (id: <ObjectId>)

📦  Seeding approval status...
  ✅  Approval status created: Not Submitted

📦  Seeding PEOs...
  ✅  PEOs created (3 objectives)

📦  Seeding Student Outcomes...
  ✅  Student Outcomes created (3 outcomes)

📦  Seeding Course Outcomes...
  ✅  Course Outcomes created (2 outcomes: CO1, CO2)

📦  Seeding Course Mapping...
  ✅  Course Mapping created (2 rows)

📦  Seeding Weekly Schedule...
  ✅  Weekly Schedule created (2 weeks)

📦  Seeding Course Evaluation per CO...
  ✅  Course Evaluation per CO created (2 entries)

──────────────────────────────────────────────────────────
✅  SEED COMPLETE
──────────────────────────────────────────────────────────
```

> **Idempotent**: Running `node seed.js` a second time skips already-existing records. It will not duplicate data.

---

## Step 3 — Start the Application

```bash
npm start
```

App starts at: **http://localhost:3000**  
Login page: **http://localhost:3000/login**

---

## Test Accounts

> Password for **all accounts**: `12345678`

| Username | Role | Redirects to after login |
|---|---|---|
| `egrequillo` | Professor | `/faculty` |
| `mbtabanao` | Program Chair | `/syllabus/prog-chair` |
| `mgcalamba` | Dean | `/dean/syllabus` |
| `vpaa_test` | HR | `/syllabus/hr` |
| `testadmin` | Admin | `/syllabus/hr` |
| `testhr` | HR | `/syllabus/hr` |

---

## Detected Collections (mainDB)

These are the MongoDB collections used by the Syllabus module:

| Collection Name | Mongoose Model | Purpose |
|---|---|---|
| `users` | `User` | Login accounts, session data |
| `syllabuses` | `Syllabus` | Main syllabus document per course |
| `syllabusapprovalstatuses` | `SyllabusApprovalStatus` | Approval workflow state |
| `programeducationalobjectives` | `ProgramEducationalObjectives` | PEOs linked per syllabus |
| `studenteducationalobjectives` | `StudentEducationalObjectives` | SOs linked per syllabus |
| `courseoutcomes` | `CourseOutcomes` | CO entries (Step 2) |
| `coursemappings` | `CourseMapping` | CO-to-SO alignment matrix |
| `weeklySchedules` | `WeeklySchedule` | Weekly teaching schedule (Step 3) |
| `courseevaluationpercos` | `CourseEvaluationPerCO` | Grade distribution per CO (Step 3) |

---

## What Was Seeded & Why

| Data | Reason required |
|---|---|
| **6 users** | Login authentication (`loginRoutes.js:18`): email = `username@mcm.edu.ph` |
| **1 Syllabus** (CPE107L-1, owned by egrequillo) | `courseOverview.js:145` queries `Syllabus.find({userID})` for dashboard load |
| **1 SyllabusApprovalStatus** (Not Submitted) | `courseOverview.js:153` joins approvals to show course status badges |
| **1 PEO record** | `newSyllabusRoutes.js:24` — `ProgramEducationalObjectives.findOne({syllabusID})` for Step 1 |
| **1 SO record** | `newSyllabusRoutes.js:25` — `StudentEducationalObjectives.findOne({syllabusID})` for Step 1 |
| **2 CourseOutcomes** | `infoSyllabusRoutes.js:13`, `scheduleSyllabusRoutes.js:22`, `previewRoutes.js:24` |
| **2 CourseMappings** | `infoSyllabusRoutes.js:14`, `previewRoutes.js:25` |
| **2 WeeklySchedules** | `scheduleSyllabusRoutes.js:20`, `previewRoutes.js:29` |
| **2 CourseEvaluationPerCOs** | `scheduleSyllabusRoutes.js:21`, `previewRoutes.js:30` |

---

## Navigation URLs for Manual Testing

After logging in as `egrequillo`, replace `<syllabusId>` with the ID printed by `node seed.js`.

| Step | URL | Route file |
|---|---|---|
| Login | `POST /login` | `loginRoutes.js` |
| Faculty Dashboard | `GET /faculty` | `courseOverviewFaculty.js` |
| Course Overview | `GET /syllabus/<userId>` | `courseOverview.js` |
| **Step 1** — Basic Info | `GET /syllabus/create/<syllabusId>` | `newSyllabusRoutes.js` |
| **Step 2** — CO & Mapping | `GET /syllabus/info/<syllabusId>` | `infoSyllabusRoutes.js` |
| **Step 3** — Schedule | `GET /syllabus/schedule/<syllabusId>` | `scheduleSyllabusRoutes.js` |
| **Preview** | `GET /syllabus/preview/<syllabusId>` | `previewRoutes.js` |
| HR Dashboard | `GET /syllabus/hr` | `adminOverviewRoute.js` |
| Dean Dashboard | `GET /dean/syllabus` | `deanRoutes.js` |
| Program Chair Dashboard | `GET /syllabus/prog-chair` | `endorseSyllabusRoutes.js` |

---

## Verify the Database

After seeding, confirm everything is in place:

```bash
node inspect-db.js
```

Deep-dive a specific syllabus (replace with actual ID from seed output):

```bash
node inspect-db.js --syllabus 684f0a1b2c3d4e5f6a7b8c9d
```

---

## What Was NOT Seeded (intentionally omitted)

| Data | Why omitted |
|---|---|
| Approval history records | Not required for pre-revision flow; HR dashboard uses dummy fallback |
| Archived syllabuses | Out of scope |
| Extra courses | Only 1 seed course needed |
| TLA / ATA / TWS data | Other modules, not Syllabus |
| Additional announcements | Announcements module not under test |

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `MONGO_URI is not set` | Create `.env` file — see Step 1 |
| `MongoServerError: E11000 duplicate key` | User already exists with that email. Re-running `seed.js` is safe — duplicates are skipped |
| Login returns `User not found` | Username must match email prefix exactly (e.g., `egrequillo` → `egrequillo@mcm.edu.ph`) |
| Login returns `Incorrect password` | Ensure `bcrypt` is installed (`npm install`) and re-run `node seed.js` |
| Dashboard shows 0 courses for egrequillo | Check that the Syllabus was seeded correctly: run `node inspect-db.js` |
| Step 1 page opens but PEOs are empty | PEO record not seeded; run `node seed.js` |
| Preview page errors | Missing linked records; re-run `node seed.js` |
