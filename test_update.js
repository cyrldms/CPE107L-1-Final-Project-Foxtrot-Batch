import mongoose from "mongoose";
import SyllabusApprovalStatus from "./models/Syllabus/syllabusApprovalStatus.js";
import { mainDB } from "./database/mongo-dbconnect.js";

async function test() {
    try {
        console.log('Finding a doc...');
        const doc = await SyllabusApprovalStatus.findOne();
        if (!doc) {
            console.log('No docs found');
            process.exit(0);
        }
        
        console.log('Testing updateOne with strict: false on syllabus ID:', doc.syllabusID);
        await SyllabusApprovalStatus.updateOne(
            { syllabusID: doc.syllabusID },
            { $set: { sectionComments: [{ test: 'comment', reviewerRole: 'Program Chair' }] } },
            { strict: false }
        );
        
        const updated = await SyllabusApprovalStatus.findOne({ syllabusID: doc.syllabusID }).lean();
        console.log('Updated doc sectionComments:', updated.sectionComments);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
