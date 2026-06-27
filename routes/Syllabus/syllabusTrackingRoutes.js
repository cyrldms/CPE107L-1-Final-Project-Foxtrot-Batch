import express from 'express';
import Syllabus from '../../models/Syllabus/syllabus.js';
import SyllabusApprovalStatus from '../../models/Syllabus/syllabusApprovalStatus.js';

const syllabusTrackingRoutes = express.Router();

syllabusTrackingRoutes.get('/', async (req, res) => {
    try {
        // Fetch all syllabi and populate instructor
        const allSyllabi = await Syllabus.find().populate('assignedInstructor').lean();
        
        // Fetch all approval statuses
        const allStatuses = await SyllabusApprovalStatus.find().lean();
        
        let total = allSyllabi.length;
        let completedCount = 0;
        let inProgressCount = 0;
        let noDraftCount = 0;
        
        const trackingList = allSyllabi.map(syl => {
            const approval = allStatuses.find(a => a.syllabusID && a.syllabusID.toString() === syl._id.toString());
            const status = approval ? approval.status : 'No Syllabus Draft';
            
            if (status === 'Approved' || status === 'Archived') {
                completedCount++;
            } else if (status === 'No Syllabus Draft' || status === 'Not Submitted') {
                noDraftCount++;
            } else {
                inProgressCount++;
            }
            
            return {
                courseCode: syl.courseCode || 'N/A',
                courseTitle: syl.courseTitle || 'N/A',
                instructor: syl.assignedInstructor ? `${syl.assignedInstructor.firstName} ${syl.assignedInstructor.lastName}` : 'Unassigned',
                term: syl.term || 'N/A',
                schoolYear: syl.schoolYear || 'N/A',
                status: status,
                lastUpdated: approval ? (approval.approvalDate || approval.updatedAt || new Date()) : syl.updatedAt,
                syllabusId: syl._id.toString()
            };
        });
        
        // Sort by course code
        trackingList.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
        
        const completionPercentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        
        const userRole = req.session && req.session.user ? req.session.user.role : null;
        let backUrl = '/syllabus';
        if (userRole === 'Dean' || userRole === 'dean') backUrl = '/dean/syllabus';
        else if (userRole === 'Program-Chair' || userRole === 'program-chair') backUrl = '/syllabus/prog-chair';
        else if (userRole === 'Professor' || userRole === 'professor') backUrl = '/faculty';
        else if (userRole === 'Admin' || userRole === 'HR') backUrl = '/syllabus/hr';

        res.render('Syllabus/syllabusTracking', {
            metrics: {
                total,
                completed: completedCount,
                inProgress: inProgressCount,
                noDraft: noDraftCount,
                completionPercentage
            },
            trackingList,
            currentPageCategory: 'syllabus',
            user: req.session ? req.session.user : null,
            backUrl
        });

    } catch (error) {
        console.error('Error fetching syllabus tracking data:', error);
        res.status(500).send('Internal Server Error');
    }
});

export default syllabusTrackingRoutes;
