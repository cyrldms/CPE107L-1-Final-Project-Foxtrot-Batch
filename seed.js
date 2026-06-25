/**
 * seed.js — PRE-REVISION SAFE MODE
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds the MINIMUM viable data needed to:
 *   ✅ Login as any of the 6 test users
 *   ✅ Load role-specific Syllabus dashboard
 *   ✅ Open the "Create Syllabus" page
 *   ✅ Navigate Step 1 → Step 2 → Step 3
 *   ✅ Open the Preview page
 *
 * Collections touched (WRITE):
 *   mainDB.users                       — 6 test accounts
 *   mainDB.syllabuses                  — 1 seed syllabus (for egrequillo)
 *   mainDB.syllabusapprovalstatuses    — 1 record (status: Not Submitted)
 *   mainDB.programeducationalobjectives — 1 record linked to seed syllabus
 *   mainDB.studenteducationalobjectives — 1 record linked to seed syllabus
 *   mainDB.courseoutcomes              — 2 records linked to seed syllabus
 *   mainDB.coursemappings              — 1 record linked to seed syllabus
 *   mainDB.weeklySchedules             — 2 records linked to seed syllabus
 *   mainDB.courseevaluationpercos      — 2 records linked to seed syllabus
 *
 * Collections NOT touched (no seed needed):
 *   announcements, TLA, ATA, TWS, backup1, backup2
 *
 * IMPORTANT: Run ONCE on a fresh DB or re-run safely (idempotent).
 *            Existing users matched by email are SKIPPED (not overwritten).
 *            The seed syllabus for egrequillo is also skipped if it already exists.
 *
 * Usage:
 *   node seed.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ── resolve .env from the project root ──────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGO_URI is not set. Make sure .env exists and contains MONGO_URI.');
  process.exit(1);
}

// ── inline schemas (mirrors exact field names / enums from models/) ─────────
// We DO NOT import from models/ because they bind to mainDB connection
// and require the full app bootstrap. We replicate the minimum shape here.

const { Schema } = mongoose;

const userSchema = new Schema({
  address:            String,
  birthdate:          Date,
  gender:             String,
  password:           { type: String, required: true },
  employmentFromOutside: { type: Boolean, default: false },
  employmentType:     { type: String, enum: ['Full-Time', 'Part-Time'] },
  employmentStatus:   { type: String, enum: ['Yes', 'No'], default: 'No' },
  role: {
    type: String,
    enum: ['Professor', 'Program-Chair', 'Dean', 'HR', 'Admin', 'Super-Admin',
           'Practicum-Coordinator', 'VPAA', 'HRMO'],
    default: 'Professor'
  },
  department: {
    type: String,
    enum: ['ATYCB', 'CAS', 'CCIS', 'CEA', 'CHS', 'N/A'],
    required: true
  },
  program: {
    type: String,
    required: true,
    enum: [
      'ENTREP', 'MA', 'REM', 'TM', 'BSA', 'AIS',
      'COMM', 'MMA',
      'CS', 'EMC', 'IS',
      'AR', 'ChE', 'CE', 'CpE', 'EE', 'ECE', 'IE', 'ME',
      'BIO', 'PHARM', 'PSYCH', 'PT', 'MEDTECH',
      'N/A'
    ]
  },
  email:      { type: String, required: true, unique: true },
  middleName: String,
  firstName:  { type: String, required: true },
  lastName:   { type: String, required: true },
  employeeId: { type: String, unique: true, sparse: true },
  isPracticumCoordinator: { type: Boolean, default: false },
  signatureImage: { type: String, default: '' }
}, { timestamps: true });

const syllabusSchema = new Schema({
  userID:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseCode:        String,
  courseTitle:       String,
  assignedInstructor:{ type: Schema.Types.ObjectId, ref: 'User' },
  preRequisite:      String,
  coRequisite:       String,
  units:             Number,
  classSchedule:     Number,
  courseDesign:      String,
  courseDescription: String,
  term:              String,
  schoolYear:        String,
  programPreparedFor:String,
  textbook:          String,
  references:        String,
  pdf:               Buffer,
  courseImage:       String,
  conceptMap:        String
}, { timestamps: true });

const syllabusApprovalStatusSchema = new Schema({
  syllabusID:      { type: Schema.Types.ObjectId, ref: 'Syllabus', required: true },
  status: {
    type: String,
    enum: ['Approved', 'Pending', 'Not Submitted', 'Archived', 'Endorsed',
           'Returned to PC', 'Rejected', 'Returned to Dean'],
    default: 'Not Submitted'
  },
  approvalDate:    Date,
  remarks:         String,
  PC_Remarks:      String,
  Dean_Remarks:    String,
  HR_Remarks:      String,
  approvedBy:      String,
  PC_Signature:    String,
  PC_SignatoryName:String,
  Dean_Signature:  String,
  Dean_SignatoryName:String,
  archivedBy:      String,
  archivedDate:    Date,
  HR_Signature:    String,
  HR_SignatoryName:String,
  Faculty_Signature:     String,
  Faculty_SignatoryName: String
}, { timestamps: true });

const peoSchema = new Schema({
  syllabusID:  { type: Schema.Types.ObjectId, ref: 'Syllabus', required: true },
  description: [String],
  rating:      [String]
});

const soSchema = new Schema({
  syllabusID:  { type: Schema.Types.ObjectId, ref: 'Syllabus', required: true },
  description: [String],
  rating:      [String]
});

const courseOutcomesSchema = new Schema({
  syllabusID:         { type: Schema.Types.ObjectId, ref: 'Syllabus', required: true },
  tlaID:              { type: Schema.Types.ObjectId, ref: 'TLA' },
  coNumber:           String,
  description:        [String],
  thinkingSkills:     [String],
  assessmentTasks:    String,
  minSatisfactoryPerf:Number
});

const courseMappingSchema = new Schema({
  syllabusID: { type: Schema.Types.ObjectId, ref: 'Syllabus', required: true },
  numberOfCO: Number,
  program:    String,
  conceptMap: Buffer,
  fromAtoL:   [String]
});

const weeklyScheduleSchema = new Schema({
  syllabusID:         { type: Schema.Types.ObjectId, ref: 'Syllabus', required: true },
  week:               Number,
  outcomeCo:          Number,
  outcomeMo:          String,
  outcomeIlo:         String,
  coverageDay:        Number,
  coverageTopic:      String,
  tlaMode:            String,
  tlaActivities:      String,
  assessmentTaskMode: String,
  assessmentTaskTask: String,
  referenceNum:       String,
  dateCovered:        String,
  assessmentDates:    String
});

const courseEvaluationPerCOSchema = new Schema({
  syllabusID:            { type: Schema.Types.ObjectId, ref: 'Syllabus', required: true },
  coNumber:              String,
  moduleCode:            String,
  onlineTaskWeight:      Number,
  longExaminationWeight: Number,
  finalProjectWeight:    Number,
  moduleWeight:          Number,
  finalWeight:           Number,
  mediatingOutcome:      String
});

// ── connect to mainDB ────────────────────────────────────────────────────────
const conn = mongoose.createConnection(MONGO_URI, { dbName: 'mainDB' });

conn.once('open', async () => {
  console.log('✅  Connected to mainDB');

  // Register models on this connection
  const User             = conn.model('User',                        userSchema);
  const Syllabus         = conn.model('Syllabus',                    syllabusSchema);
  const ApprovalStatus   = conn.model('SyllabusApprovalStatus',      syllabusApprovalStatusSchema);
  const PEO              = conn.model('ProgramEducationalObjectives', peoSchema);
  const SO               = conn.model('StudentEducationalObjectives', soSchema);
  const CourseOutcomes   = conn.model('CourseOutcomes',              courseOutcomesSchema);
  const CourseMapping    = conn.model('CourseMapping',               courseMappingSchema);
  const WeeklySchedule   = conn.model('WeeklySchedule',             weeklyScheduleSchema);
  const CourseEvaluation = conn.model('CourseEvaluationPerCO',       courseEvaluationPerCOSchema);

  try {
    // ── SECTION 1: HASH PASSWORD (once for all users) ──────────────────────
    const SALT_ROUNDS = 10;
    const hashedPassword = await bcrypt.hash('12345678', SALT_ROUNDS);
    console.log('\n📦  Seeding users...');

    // ── SECTION 2: USER DEFINITIONS ────────────────────────────────────────
    // Login resolution: username → email = `${username}@mcm.edu.ph`
    // Email must be unique. Existing records matched by email are SKIPPED.
    const users = [
      {
        firstName:      'Eduardo',
        lastName:       'Requillo',
        middleName:     'G',
        email:          'egrequillo@mcm.edu.ph',
        employeeId:     'EMP-PROF-001',
        role:           'Professor',
        department:     'CEA',
        program:        'CpE',
        employmentType: 'Full-Time',
        employmentStatus: 'Yes',
        password:       hashedPassword
      },
      {
        firstName:      'Maria Beatriz',
        lastName:       'Tabanao',
        middleName:     'B',
        email:          'mbtabanao@mcm.edu.ph',
        employeeId:     'EMP-PC-001',
        role:           'Program-Chair',
        department:     'CEA',
        program:        'CpE',
        employmentType: 'Full-Time',
        employmentStatus: 'Yes',
        password:       hashedPassword
      },
      {
        firstName:      'Marco Gabriel',
        lastName:       'Calamba',
        middleName:     'C',
        email:          'mgcalamba@mcm.edu.ph',
        employeeId:     'EMP-DEAN-001',
        role:           'Dean',
        department:     'CEA',
        program:        'CpE',
        employmentType: 'Full-Time',
        employmentStatus: 'Yes',
        password:       hashedPassword
      },
      {
        firstName:      'VPAA',
        lastName:       'Test',
        middleName:     '',
        email:          'vpaa_test@mcm.edu.ph',
        employeeId:     'EMP-HR-001',
        role:           'HR',
        department:     'N/A',
        program:        'N/A',
        employmentType: 'Full-Time',
        employmentStatus: 'Yes',
        password:       hashedPassword
      },
      {
        firstName:      'Test',
        lastName:       'Admin',
        middleName:     '',
        email:          'testadmin@mcm.edu.ph',
        employeeId:     'EMP-ADMIN-001',
        role:           'Admin',
        department:     'N/A',
        program:        'N/A',
        employmentType: 'Full-Time',
        employmentStatus: 'Yes',
        password:       hashedPassword
      },
      {
        firstName:      'Test',
        lastName:       'HR',
        middleName:     '',
        email:          'testhr@mcm.edu.ph',
        employeeId:     'EMP-HR-002',
        role:           'HR',
        department:     'N/A',
        program:        'N/A',
        employmentType: 'Full-Time',
        employmentStatus: 'Yes',
        password:       hashedPassword
      }
    ];

    // Upsert logic — skip existing emails to stay idempotent
    const savedUsers = {};
    for (const u of users) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        console.log(`  ⏭️  User already exists: ${u.email} — skipped`);
        savedUsers[u.email] = existing;
      } else {
        const created = await User.create(u);
        console.log(`  ✅  Created user: ${u.email}  [${u.role}]`);
        savedUsers[u.email] = created;
      }
    }

    // ── SECTION 3: SEED SYLLABUS (1 course for egrequillo, assigned to him) ──
    console.log('\n📦  Seeding 1 syllabus for egrequillo...');

    const prof = savedUsers['egrequillo@mcm.edu.ph'];
    const COURSE_CODE = 'CPE107L-1';

    let syl = await Syllabus.findOne({ userID: prof._id, courseCode: COURSE_CODE });

    if (syl) {
      console.log(`  ⏭️  Syllabus "${COURSE_CODE}" already exists for egrequillo — skipped`);
    } else {
      syl = await Syllabus.create({
        userID:             prof._id,
        assignedInstructor: prof._id,
        courseCode:         COURSE_CODE,
        courseTitle:        'Computer Engineering Laboratory',
        preRequisite:       'None',
        coRequisite:        'None',
        units:              3,
        classSchedule:      3,
        courseDesign:       'Lecture',
        courseDescription:  'A foundational laboratory course in Computer Engineering covering hardware and software integration.',
        term:               '1st Semester',
        schoolYear:         '2025-2026',
        programPreparedFor: 'Bachelor of Science in Computer Engineering',
        textbook:           'Computer Organization and Architecture by Stallings',
        references:         'IEEE Standards; Supplementary materials provided by the department'
      });
      console.log(`  ✅  Syllabus created: ${COURSE_CODE} (id: ${syl._id})`);
    }

    const sylId = syl._id;

    // ── SECTION 4: SEED APPROVAL STATUS ────────────────────────────────────
    // Required by courseOverview.js (line 153) and faculty dashboard (line 39)
    // Status must be 'Not Submitted' for a fresh pre-revision test
    console.log('\n📦  Seeding approval status...');

    const existingApproval = await ApprovalStatus.findOne({ syllabusID: sylId });
    if (existingApproval) {
      console.log(`  ⏭️  Approval status already exists for syllabus — skipped`);
    } else {
      await ApprovalStatus.create({
        syllabusID: sylId,
        status:     'Not Submitted',
        remarks:    'Seed data — awaiting initial submission'
      });
      console.log(`  ✅  Approval status created: Not Submitted`);
    }

    // ── SECTION 5: PEO (Program Educational Objectives) ────────────────────
    // Required by newSyllabusRoutes GET (line 24) and previewRoutes (line 27)
    console.log('\n📦  Seeding PEOs...');

    const existingPeo = await PEO.findOne({ syllabusID: sylId });
    if (existingPeo) {
      console.log(`  ⏭️  PEO already exists — skipped`);
    } else {
      await PEO.create({
        syllabusID:  sylId,
        description: [
          'Graduates apply knowledge of mathematics and engineering sciences.',
          'Graduates design and implement computer-based systems.',
          'Graduates communicate effectively in multidisciplinary teams.'
        ],
        rating: ['I', 'D', 'I']
      });
      console.log(`  ✅  PEOs created (3 objectives)`);
    }

    // ── SECTION 6: SO (Student Outcomes) ────────────────────────────────────
    // Required by newSyllabusRoutes GET (line 25) and previewRoutes (line 28)
    console.log('\n📦  Seeding Student Outcomes...');

    const existingSo = await SO.findOne({ syllabusID: sylId });
    if (existingSo) {
      console.log(`  ⏭️  Student Outcomes already exists — skipped`);
    } else {
      await SO.create({
        syllabusID:  sylId,
        description: [
          'Ability to apply engineering principles to solve real-world problems.',
          'Ability to design systems that meet specified needs within constraints.',
          'Ability to function effectively on multidisciplinary teams.'
        ],
        rating: ['I', 'D', 'A']
      });
      console.log(`  ✅  Student Outcomes created (3 outcomes)`);
    }

    // ── SECTION 7: COURSE OUTCOMES ───────────────────────────────────────────
    // Required by infoSyllabusRoutes (line 13), scheduleSyllabus (line 22),
    // and previewRoutes (line 24)
    console.log('\n📦  Seeding Course Outcomes...');

    const existingCO = await CourseOutcomes.findOne({ syllabusID: sylId });
    if (existingCO) {
      console.log(`  ⏭️  Course Outcomes already exist — skipped`);
    } else {
      await CourseOutcomes.insertMany([
        {
          syllabusID:          sylId,
          coNumber:            'CO1',
          description:         ['Demonstrate proficiency in computer hardware interfacing.'],
          thinkingSkills:      ['Analysis'],
          assessmentTasks:     'Laboratory Experiments, Quizzes',
          minSatisfactoryPerf: 75
        },
        {
          syllabusID:          sylId,
          coNumber:            'CO2',
          description:         ['Apply software development principles to embedded systems.'],
          thinkingSkills:      ['Application'],
          assessmentTasks:     'Programming Exercises, Final Project',
          minSatisfactoryPerf: 75
        }
      ]);
      console.log(`  ✅  Course Outcomes created (2 outcomes: CO1, CO2)`);
    }

    // ── SECTION 8: COURSE MAPPING ─────────────────────────────────────────────
    // Required by infoSyllabusRoutes (line 14) and previewRoutes (line 25)
    console.log('\n📦  Seeding Course Mapping...');

    const existingMapping = await CourseMapping.findOne({ syllabusID: sylId });
    if (existingMapping) {
      console.log(`  ⏭️  Course Mapping already exists — skipped`);
    } else {
      // fromAtoL maps to columns a-l (12 ABET SO letters)
      await CourseMapping.insertMany([
        {
          syllabusID: sylId,
          numberOfCO: 1,
          program:    'Computer Engineering',
          fromAtoL:   ['I', '', 'D', '', '', '', '', '', '', '', '', '']  // CO1 → a:I, c:D
        },
        {
          syllabusID: sylId,
          numberOfCO: 2,
          program:    'Computer Engineering',
          fromAtoL:   ['', 'I', 'D', '', '', '', '', '', '', '', '', '']  // CO2 → b:I, c:D
        }
      ]);
      console.log(`  ✅  Course Mapping created (2 rows)`);
    }

    // ── SECTION 9: WEEKLY SCHEDULE ─────────────────────────────────────────────
    // Required by scheduleSyllabusRoutes GET (line 20) and previewRoutes (line 29)
    console.log('\n📦  Seeding Weekly Schedule...');

    const existingSched = await WeeklySchedule.findOne({ syllabusID: sylId });
    if (existingSched) {
      console.log(`  ⏭️  Weekly Schedule already exists — skipped`);
    } else {
      await WeeklySchedule.insertMany([
        {
          syllabusID:         sylId,
          week:               1,
          outcomeCo:          1,
          outcomeMo:          'MO1',
          outcomeIlo:         'ILO1',
          coverageDay:        3,
          coverageTopic:      'Introduction to Computer Engineering Laboratory',
          tlaMode:            'Lecture',
          tlaActivities:      'Class discussion, Q&A',
          assessmentTaskMode: 'Formative',
          assessmentTaskTask: 'Short quiz',
          referenceNum:       'Chapter 1',
          dateCovered:        'Week 1'
        },
        {
          syllabusID:         sylId,
          week:               2,
          outcomeCo:          1,
          outcomeMo:          'MO1',
          outcomeIlo:         'ILO2',
          coverageDay:        3,
          coverageTopic:      'Hardware Interfacing Fundamentals',
          tlaMode:            'Laboratory',
          tlaActivities:      'Hands-on experiment with GPIO',
          assessmentTaskMode: 'Summative',
          assessmentTaskTask: 'Lab experiment report',
          referenceNum:       'Chapter 2',
          dateCovered:        'Week 2'
        }
      ]);
      console.log(`  ✅  Weekly Schedule created (2 weeks)`);
    }

    // ── SECTION 10: COURSE EVALUATION PER CO ────────────────────────────────────
    // Required by scheduleSyllabusRoutes GET (line 21) and previewRoutes (line 30)
    console.log('\n📦  Seeding Course Evaluation per CO...');

    const existingEval = await CourseEvaluation.findOne({ syllabusID: sylId });
    if (existingEval) {
      console.log(`  ⏭️  Course Evaluation already exists — skipped`);
    } else {
      await CourseEvaluation.insertMany([
        {
          syllabusID:            sylId,
          coNumber:              'CO1',
          moduleCode:            'M1',
          onlineTaskWeight:      20,
          longExaminationWeight: 30,
          finalProjectWeight:    20,
          moduleWeight:          50,
          finalWeight:           50,
          mediatingOutcome:      'Hardware Interfacing'
        },
        {
          syllabusID:            sylId,
          coNumber:              'CO2',
          moduleCode:            'M2',
          onlineTaskWeight:      20,
          longExaminationWeight: 30,
          finalProjectWeight:    20,
          moduleWeight:          50,
          finalWeight:           50,
          mediatingOutcome:      'Embedded Software'
        }
      ]);
      console.log(`  ✅  Course Evaluation per CO created (2 entries)`);
    }

    // ── SUMMARY ──────────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(60));
    console.log('✅  SEED COMPLETE');
    console.log('─'.repeat(60));
    console.log('\n📋  Collections seeded in mainDB:');
    console.log('  • users                          (6 records)');
    console.log('  • syllabuses                     (1 record)');
    console.log('  • syllabusapprovalstatuses        (1 record)');
    console.log('  • programeducationalobjectives    (1 record)');
    console.log('  • studenteducationalobjectives    (1 record)');
    console.log('  • courseoutcomes                  (2 records)');
    console.log('  • coursemappings                  (2 records)');
    console.log('  • weeklySchedules                 (2 records)');
    console.log('  • courseevaluationpercos          (2 records)');

    console.log('\n👤  Test Accounts (password: 12345678):');
    console.log('  Username      | Role           | Login URL');
    console.log('  ─────────────────────────────────────────────────');
    console.log('  egrequillo    | Professor       | /login → /faculty');
    console.log('  mbtabanao     | Program-Chair   | /login → /syllabus/prog-chair');
    console.log('  mgcalamba     | Dean            | /login → /dean/syllabus');
    console.log('  vpaa_test     | HR              | /login → /syllabus/hr');
    console.log('  testadmin     | Admin           | /login → /syllabus/hr');
    console.log('  testhr        | HR              | /login → /syllabus/hr');

    console.log('\n🗺️  Test Flow for egrequillo (Professor):');
    console.log(`  1. Login       → POST /login  (username: egrequillo)`);
    console.log(`  2. Dashboard   → GET  /faculty  (courses listed)`);
    console.log(`  3. Course card → GET  /syllabus/${syl._id}  (courseOverview)`);
    console.log(`  4. Create page → GET  /syllabus/create/${syl._id}  (Step 1)`);
    console.log(`  5. Info page   → GET  /syllabus/info/${syl._id}    (Step 2)`);
    console.log(`  6. Schedule    → GET  /syllabus/schedule/${syl._id} (Step 3)`);
    console.log(`  7. Preview     → GET  /syllabus/preview/${syl._id}  (Preview)`);
    console.log('\n  Seed Syllabus ID:', syl._id.toString());
    console.log('─'.repeat(60));

  } catch (err) {
    console.error('\n❌  Seed failed:', err.message);
    console.error(err);
  } finally {
    await conn.close();
    console.log('\n🔌  DB connection closed.');
    process.exit(0);
  }
});

conn.on('error', (err) => {
  console.error('❌  MongoDB connection error:', err.message);
  process.exit(1);
});
