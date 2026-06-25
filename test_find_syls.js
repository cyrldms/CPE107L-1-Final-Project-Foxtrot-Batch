import mongoose from 'mongoose';
import { mainDB } from './database/mongo-dbconnect.js';
import Syllabus from './models/Syllabus/syllabus.js';

async function test() {
    try {
        const syls = await Syllabus.find({ courseCode: 'CPE003L' }).lean();
        console.log(`Found ${syls.length} syllabi for CPE003L:`);
        syls.forEach(s => {
            console.log('ID:', s._id, '| Course:', s.courseCode, '-', s.courseTitle);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
