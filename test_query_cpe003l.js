import mongoose from "mongoose";
import SyllabusApprovalStatus from "./models/Syllabus/syllabusApprovalStatus.js";
import { mainDB } from "./database/mongo-dbconnect.js";

async function test() {
    try {
        const sylId = '6a3af0eab8d07e82873b31ee'; // CPE003L
        console.log('Querying CPE003L...');
        
        const docs = await SyllabusApprovalStatus.find({ syllabusID: sylId }).lean();
        console.log(`Found ${docs.length} docs for CPE003L.`);
        
        docs.forEach(doc => {
            console.log(`Status: ${doc.status}`);
            console.log('Comments:', doc.sectionComments);
        });
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
