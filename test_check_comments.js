import mongoose from "mongoose";
import SyllabusApprovalStatus from "./models/Syllabus/syllabusApprovalStatus.js";
import { mainDB } from "./database/mongo-dbconnect.js";

async function test() {
    try {
        console.log('Querying all approvals...');
        const docs = await SyllabusApprovalStatus.find().lean();
        console.log('Total approvals:', docs.length);
        docs.forEach(doc => {
            if (doc.sectionComments && doc.sectionComments.length > 0) {
                console.log(`Syllabus ID: ${doc.syllabusID}`);
                console.log('Comments:', doc.sectionComments);
            }
        });
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
