import express from 'express';
import mongoose from 'mongoose';
import { mainDB } from '../../database/mongo-dbconnect.js';
import Syllabus from '../../models/Syllabus/syllabus.js';
import SyllabusApprovalStatus from '../../models/Syllabus/syllabusApprovalStatus.js';
import ProgramEducationObjectives from '../../models/Syllabus/programEducationObjectives.js';
import StudentEducationObjectives from '../../models/Syllabus/studentEducationalObjectives.js';
import CourseOutcomes from '../../models/Syllabus/courseOutcomes.js';
import CourseMapping from '../../models/Syllabus/courseMapping.js';
import WeeklySchedule from '../../models/Syllabus/weeklySchedule.js';
import CourseEvaluationPerCO from '../../models/Syllabus/courseEvaluationPerCO.js';


const coursesOverviewFacultyRouter = express.Router();

function getLatestRemark(a) {
    if (!a) return "";
    if (a.status === 'Archived') return a.HR_Remarks || a.Dean_Remarks || a.PC_Remarks || a.remarks || "";
    if (a.status === 'Approved' || a.status === 'Returned to PC') return a.Dean_Remarks || a.PC_Remarks || a.remarks || "";
    if (a.status === 'Endorsed' || a.status === 'PC_Approved') return a.PC_Remarks || a.remarks || "";
    if (a.status === 'Rejected') {
        if (a.approvedBy && a.approvedBy.includes('Dean')) return a.Dean_Remarks || a.PC_Remarks || a.remarks || "";
        return a.PC_Remarks || a.remarks || "";
    }
    // Fallback
    return a.remarks || "";
}

/**
 * READ logic for the main dashboard load
 */
coursesOverviewFacultyRouter.get('/', async (req, res) => {
    try {
        const searchQuery = req.query.search ? req.query.search.toLowerCase() : '';

        // The Faculty should see every course created by the Program Chair
        const filter = { courseCode: { $ne: '__GLOBAL_TEMPLATE__' } };
        let userCourses = await Syllabus.find(filter);

        if (mainDB.models.User) {
            await Syllabus.populate(userCourses, { path: 'assignedInstructor' });
        }

        const courseIds = userCourses.map(c => c._id.toString());
        const approvals = await SyllabusApprovalStatus.find({ syllabusID: { $in: courseIds } });

        const formattedCourses = userCourses.map(c => {
            const idStr = c._id.toString();
            const draftRecord = approvals.find(a => a.syllabusID.toString() === idStr);

            return {
                id: idStr,
                code: c.courseCode,
                title: c.courseTitle,
                instructor: c.assignedInstructor
                    ? `${c.assignedInstructor.firstName} ${c.assignedInstructor.lastName}`
                    : "TBA",
                img: (c.courseImage && c.courseImage.startsWith('data:'))
                    ? c.courseImage
                    : `https://picsum.photos/seed/${c._id}/400/200`,
                hasDraft: !!draftRecord,
                status: draftRecord ? draftRecord.status : "No Syllabus Draft",
                remarks: draftRecord ? getLatestRemark(draftRecord) : "",
                pcRemarks: draftRecord ? (draftRecord.PC_Remarks || "") : "",
                deanRemarks: draftRecord ? (draftRecord.Dean_Remarks || "") : "",
                hrRemarks: draftRecord ? (draftRecord.HR_Remarks || "") : ""
            };
        });

        res.render('Syllabus/courseOverviewFaculty', {
            courses: formattedCourses,
            userId: 'faculty',
            searchQuery: req.query.search || '',
            currentPageCategory: 'syllabus',
            user: req.session.user
        });
    } catch (error) {
        console.error("Faculty Dashboard error:", error);
        res.render('Syllabus/courseOverviewFaculty', {
            courses: [],
            userId: 'faculty',
            searchQuery: '',
            currentPageCategory: 'syllabus',
            user: req.session.user
        });
    }
});

/**
 * POST — Save faculty e-signature before PDF download
 */
coursesOverviewFacultyRouter.post('/sign-faculty/:syllabusId', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const { signatureImage } = req.body;

        if (!signatureImage) {
            return res.status(400).json({ success: false, message: 'No signature provided.' });
        }

        const loggedInUser = req.session && req.session.user ? req.session.user : null;
        if (!loggedInUser) {
            return res.status(401).json({ success: false, message: 'Not authenticated.' });
        }

        const facultyName = [loggedInUser.firstName, loggedInUser.lastName].filter(Boolean).join(' ');

        const approval = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId });
        if (!approval) {
            return res.status(404).json({ success: false, message: 'Approval record not found.' });
        }

        if (approval.status !== 'Archived') {
            return res.status(403).json({ success: false, message: 'Syllabus must be verified by HR before signing.' });
        }

        approval.Faculty_Signature = signatureImage;
        approval.Faculty_SignatoryName = facultyName;
        await approval.save();

        return res.json({ success: true, message: 'Signature saved successfully.' });
    } catch (error) {
        console.error('Error saving faculty signature:', error);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
});

/**
 * GET — Check if a faculty signature already exists for a syllabus
 */
coursesOverviewFacultyRouter.get('/check-signature/:syllabusId', async (req, res) => {
    try {
        const { syllabusId } = req.params;
        const approval = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId });
        if (!approval) {
            return res.json({ hasSigned: false });
        }
        return res.json({
            hasSigned: !!approval.Faculty_Signature,
            signatureImage: approval.Faculty_Signature || null
        });
    } catch (error) {
        console.error('Error checking faculty signature:', error);
        return res.status(500).json({ hasSigned: false });
    }
});


/**
 * GET — Render Faculty Submission Page
 */
coursesOverviewFacultyRouter.get('/submit/:syllabusId', async (req, res) => {
    const { syllabusId } = req.params;
    try {
        const syl = await Syllabus.findById(syllabusId).populate('assignedInstructor');
        const approval = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId }).lean();

        if (syl) {
            const peos = await ProgramEducationObjectives.find({ syllabusID: syllabusId });
            const seos = await StudentEducationObjectives.find({ syllabusID: syllabusId });
            const cos = await CourseOutcomes.find({ syllabusID: syllabusId });
            const mappings = await CourseMapping.find({ syllabusID: syllabusId });
            const schedules = await WeeklySchedule.find({ syllabusID: syllabusId }).sort({ week: 1 });
            const evaluations = await CourseEvaluationPerCO.find({ syllabusID: syllabusId });

            return res.render('Syllabus/syllabusSubmissionFaculty', {
                syl,
                peos,
                seos,
                cos,
                mappings,
                schedules,
                evaluations,
                courseName: syl.courseTitle || 'Course Name',
                courseCode: syl.courseCode || 'Course Code',
                courseSection: syl.section || 'Section',
                academicYear: syl.academicYear || 'Academic Year',
                fileType: 'Faculty Submission',
                syllabusId: syllabusId,
                currentStatus: approval ? approval.status : 'Pending Endorsement',
                approvalState: approval ? approval.approvedBy : null,
                existingComment: '',
                sectionComments: approval && approval.sectionComments ? approval.sectionComments : [],
                currentPageCategory: 'syllabus',
                actionUrlPrefix: '/faculty/submit',
                optionApproveValue: 'Pending Endorsement',
                actionTitle: 'Faculty Submission',
                workflowStep: 'faculty_submission',
                actionLabel: 'Submission',
                user: req.session.user,
                facultySignature: approval ? approval.Faculty_Signature : null,
                facultySignatoryName: approval ? approval.Faculty_SignatoryName : '',
                pcSignature: approval ? approval.PC_Signature : null,
                pcSignatoryName: approval ? approval.PC_SignatoryName : '',
                deanSignature: approval ? approval.Dean_Signature : null,
                deanSignatoryName: approval ? approval.Dean_SignatoryName : ''
            });
        }
    } catch (err) {
        console.error('Faculty submission preview error:', err);
    }
    res.redirect('/faculty');
});

/**
 * POST — Final Submission by Faculty
 */
coursesOverviewFacultyRouter.post('/submit/:syllabusId', async (req, res) => {
    const { syllabusId } = req.params;
    const { signature, signatoryName, action } = req.body;

    try {
        if (!signature || !signatoryName) {
            return res.status(400).send('Signature and Signatory Name are required.');
        }

        let approval = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId });
        if (!approval) {
            approval = new SyllabusApprovalStatus({
                syllabusID: syllabusId,
                status: 'Pending',
                approvedBy: [],
                remarks: ''
            });
        }

        approval.Faculty_Signature = signature;
        approval.Faculty_SignatoryName = signatoryName;
        approval.status = 'Pending';
        
        await approval.save();
        
        if (req.body.sectionComments !== undefined) {
            await SyllabusApprovalStatus.updateOne(
                { syllabusID: syllabusId },
                { $set: { sectionComments: req.body.sectionComments } },
                { strict: false }
            );
        }

        res.json({ success: true, message: 'Submitted successfully' });
    } catch (error) {
        console.error('Error submitting syllabus from faculty:', error);
        res.status(500).send('Internal Server Error');
    }
});

export default coursesOverviewFacultyRouter;

