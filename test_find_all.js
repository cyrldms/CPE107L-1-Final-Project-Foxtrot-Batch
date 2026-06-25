import mongoose from 'mongoose';
import { mainDB } from './database/mongo-dbconnect.js';
import SyllabusApprovalStatus from './models/Syllabus/syllabusApprovalStatus.js';

async function test() {
    try {
        const sylId = '6a3af0eab8d07e82873b31ee';
        const approvals = await SyllabusApprovalStatus.find({ syllabusID: sylId }).lean();
        console.log(`Found ${approvals.length} approvals for CPE003L:`);
        approvals.forEach(approval => {
            console.log('ID:', approval._id, '| Status:', approval.status);
            console.log('Comments array:', approval.sectionComments);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();
