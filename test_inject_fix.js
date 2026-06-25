import mongoose from "mongoose";
import SyllabusApprovalStatus from "./models/Syllabus/syllabusApprovalStatus.js";
import { mainDB } from "./database/mongo-dbconnect.js";

async function test() {
    try {
        const sylId = '6a3af0eab8d07e82873b31ee'; // CPE003L
        console.log('Fixing injected comment for CPE003L...');
        
        await SyllabusApprovalStatus.updateMany(
            { syllabusID: sylId },
            { $set: { sectionComments: [{ sectionKey: 'course_details', comment: 'This is the Program Chair comment for Course Details!', reviewerRole: 'Program Chair', reviewerName: 'PC User', createdAt: new Date() }] } },
            { strict: false }
        );
        
        console.log('Fixed injected test comment!');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
