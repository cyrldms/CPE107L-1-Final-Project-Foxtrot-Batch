/**
 * inspect-db.js — PRE-REVISION SAFE MODE
 * ─────────────────────────────────────────────────────────────────────────────
 * Read-only diagnostic tool. Connects to mainDB and prints:
 *   • Collection document counts
 *   • All users (masked password)
 *   • All syllabuses with their linked approval status
 *   • Counts of all Syllabus sub-documents per syllabusID
 *
 * DOES NOT write, update, or delete anything.
 *
 * Usage:
 *   node inspect-db.js
 *   node inspect-db.js --syllabus <syllabusId>   (deep-dive a specific syllabus)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌  MONGO_URI not set. Check your .env file.');
  process.exit(1);
}

// Parse optional --syllabus flag
const args = process.argv.slice(2);
const syllabusFlag = args.indexOf('--syllabus');
const targetSyllabusId = syllabusFlag !== -1 ? args[syllabusFlag + 1] : null;

const conn = mongoose.createConnection(MONGO_URI, { dbName: 'mainDB' });

conn.once('open', async () => {
  console.log('\n✅  Connected to mainDB\n');
  const db = conn.db;

  // ── Helper ───────────────────────────────────────────────────────────────
  const count = async (col) => {
    try { return await db.collection(col).countDocuments(); }
    catch { return 'N/A'; }
  };

  const sep = () => console.log('─'.repeat(70));

  // ── 1. COLLECTION COUNTS ─────────────────────────────────────────────────
  sep();
  console.log('📊  COLLECTION COUNTS (mainDB)');
  sep();

  const collections = [
    ['users',                           'Users'],
    ['syllabuses',                      'Syllabuses'],
    ['syllabusapprovalstatuses',         'SyllabusApprovalStatus'],
    ['programeducationalobjectives',     'ProgramEducationalObjectives'],
    ['studenteducationalobjectives',     'StudentEducationalObjectives'],
    ['courseoutcomes',                   'CourseOutcomes'],
    ['coursemappings',                   'CourseMappings'],
    ['weeklySchedules',                  'WeeklySchedules'],
    ['courseevaluationpercos',           'CourseEvaluationPerCOs'],
    ['announcements',                    'Announcements'],
    ['tlas',                             'TLAs'],
  ];

  for (const [col, label] of collections) {
    const n = await count(col);
    const bar = typeof n === 'number' ? '█'.repeat(Math.min(n, 20)) : '';
    console.log(`  ${label.padEnd(40)} ${String(n).padStart(4)}  ${bar}`);
  }

  // ── 2. USERS ──────────────────────────────────────────────────────────────
  sep();
  console.log('👤  USERS');
  sep();

  const users = await db.collection('users').find({}).toArray();
  if (users.length === 0) {
    console.log('  ⚠️  No users found. Run: node seed.js');
  } else {
    for (const u of users) {
      const loginName = u.email ? u.email.replace('@mcm.edu.ph', '') : '?';
      const pwMask = u.password ? '(hashed ✅)' : '(MISSING ❌)';
      console.log(`  [${u.role?.padEnd(14)}]  username: ${loginName.padEnd(16)} name: ${u.firstName} ${u.lastName}  pw: ${pwMask}`);
    }
  }

  // ── 3. SYLLABUSES ─────────────────────────────────────────────────────────
  sep();
  console.log('📚  SYLLABUSES');
  sep();

  const syllabuses = await db.collection('syllabuses').find({}).toArray();
  if (syllabuses.length === 0) {
    console.log('  ⚠️  No syllabuses found. Run: node seed.js');
  } else {
    for (const s of syllabuses) {
      const approval = await db.collection('syllabusapprovalstatuses')
        .findOne({ syllabusID: s._id });

      const peoCount = await db.collection('programeducationalobjectives')
        .countDocuments({ syllabusID: s._id });
      const soCount  = await db.collection('studenteducationalobjectives')
        .countDocuments({ syllabusID: s._id });
      const coCount  = await db.collection('courseoutcomes')
        .countDocuments({ syllabusID: s._id });
      const mapCount = await db.collection('coursemappings')
        .countDocuments({ syllabusID: s._id });
      const schCount = await db.collection('weeklySchedules')
        .countDocuments({ syllabusID: s._id });
      const evlCount = await db.collection('courseevaluationpercos')
        .countDocuments({ syllabusID: s._id });

      console.log(`\n  🔑  ID:     ${s._id}`);
      console.log(`      Code:   ${s.courseCode || '—'}  |  Title: ${s.courseTitle || '—'}`);
      console.log(`      Owner:  ${s.userID}   (assignedInstructor: ${s.assignedInstructor || 'none'})`);
      console.log(`      Status: ${approval ? approval.status : '⚠️  NO APPROVAL RECORD'}`);
      console.log(`      Linked records:`);
      console.log(`        PEOs:${peoCount}  SOs:${soCount}  COs:${coCount}  Mappings:${mapCount}  Weeks:${schCount}  Evaluations:${evlCount}`);

      // navigation URLs
      console.log(`      Navigation URLs:`);
      console.log(`        Dashboard  → /syllabus/${s.userID}`);
      console.log(`        Step 1     → /syllabus/create/${s._id}`);
      console.log(`        Step 2     → /syllabus/info/${s._id}`);
      console.log(`        Step 3     → /syllabus/schedule/${s._id}`);
      console.log(`        Preview    → /syllabus/preview/${s._id}`);
    }
  }

  // ── 4. DEEP-DIVE (optional --syllabus flag) ──────────────────────────────
  if (targetSyllabusId) {
    sep();
    console.log(`🔍  DEEP-DIVE: syllabusID = ${targetSyllabusId}`);
    sep();

    let oid;
    try {
      oid = new mongoose.Types.ObjectId(targetSyllabusId);
    } catch {
      console.log('  ❌  Invalid ObjectId format.');
      await conn.close();
      process.exit(0);
    }

    const syl = await db.collection('syllabuses').findOne({ _id: oid });
    if (!syl) {
      console.log('  ❌  Syllabus not found.');
    } else {
      console.log('\n  Syllabus:', JSON.stringify(syl, null, 4));

      const approval = await db.collection('syllabusapprovalstatuses').findOne({ syllabusID: oid });
      console.log('\n  Approval Status:', approval ? JSON.stringify(approval, null, 4) : 'NONE');

      const peos = await db.collection('programeducationalobjectives').find({ syllabusID: oid }).toArray();
      console.log('\n  PEOs:', JSON.stringify(peos, null, 4));

      const sos = await db.collection('studenteducationalobjectives').find({ syllabusID: oid }).toArray();
      console.log('\n  SOs:', JSON.stringify(sos, null, 4));

      const cos = await db.collection('courseoutcomes').find({ syllabusID: oid }).toArray();
      console.log('\n  Course Outcomes:', JSON.stringify(cos, null, 4));

      const maps = await db.collection('coursemappings').find({ syllabusID: oid }).toArray();
      console.log('\n  Course Mappings:', JSON.stringify(maps, null, 4));

      const scheds = await db.collection('weeklySchedules').find({ syllabusID: oid }).sort({ week: 1 }).toArray();
      console.log('\n  Weekly Schedule:', JSON.stringify(scheds, null, 4));

      const evals = await db.collection('courseevaluationpercos').find({ syllabusID: oid }).toArray();
      console.log('\n  Course Evaluation per CO:', JSON.stringify(evals, null, 4));
    }
  }

  sep();
  console.log('🔌  Inspection complete.\n');
  await conn.close();
  process.exit(0);
});

conn.on('error', (err) => {
  console.error('❌  MongoDB connection error:', err.message);
  process.exit(1);
});
