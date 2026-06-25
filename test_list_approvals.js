import mongoose from "mongoose";
import SyllabusApprovalStatus from "./models/Syllabus/syllabusApprovalStatus.js";
import Syllabus from "./models/Syllabus/syllabus.js";
import { mainDB } from "./database/mongo-dbconnect.js";

async function test() {
    try {
        console.log('Querying all approvals...');
        const docs = await SyllabusApprovalStatus.find().lean();
        
        for (let doc of docs) {
            const syl = await Syllabus.findById(doc.syllabusID).lean();
            console.log(`Syllabus ID: ${doc.syllabusID} | Status: ${doc.status} | Course: ${syl?.courseCode} - ${syl?.courseTitle}`);
        }
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
