import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'routes/Syllabus/courseOverviewFaculty.js');
let content = fs.readFileSync(filePath, 'utf8');

// Add imports
const importsToAdd = `
import ProgramEducationObjectives from '../../models/Syllabus/programEducationObjectives.js';
import StudentEducationObjectives from '../../models/Syllabus/studentEducationalObjectives.js';
import CourseOutcomes from '../../models/Syllabus/courseOutcomes.js';
import CourseMapping from '../../models/Syllabus/courseMapping.js';
import WeeklySchedule from '../../models/Syllabus/weeklySchedule.js';
import CourseEvaluationPerCO from '../../models/Syllabus/courseEvaluationPerCO.js';
`;
content = content.replace("import SyllabusApprovalStatus from '../../models/Syllabus/syllabusApprovalStatus.js';", "import SyllabusApprovalStatus from '../../models/Syllabus/syllabusApprovalStatus.js';" + importsToAdd);

// Add routes
const routesToAdd = `
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
                currentStatus: approval ? approval.status : 'Pending',
                approvalState: approval ? approval.approvedBy : null,
                existingComment: '',
                sectionComments: [],
                currentPageCategory: 'syllabus',
                actionUrlPrefix: '/faculty/submit',
                optionApproveValue: 'Pending',
                actionTitle: 'Faculty Submission',
                workflowStep: 'faculty_submission',
                actionLabel: 'Submission',
                user: req.session.user,
                pcSignatoryName: approval ? approval.Faculty_SignatoryName || '' : ''
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
        res.redirect('/faculty');
    } catch (error) {
        console.error('Error submitting syllabus from faculty:', error);
        res.status(500).send('Internal Server Error');
    }
});

`;

content = content.replace("export default coursesOverviewFacultyRouter;", routesToAdd + "export default coursesOverviewFacultyRouter;\n");
fs.writeFileSync(filePath, content);
console.log('courseOverviewFaculty.js updated.');
