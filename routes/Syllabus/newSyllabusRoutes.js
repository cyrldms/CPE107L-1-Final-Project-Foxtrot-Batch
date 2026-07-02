import express from 'express';
import multer from 'multer';
import Syllabus from '../../models/Syllabus/syllabus.js';
import ProgramEducationalObjectives from '../../models/Syllabus/programEducationObjectives.js';
import StudentEducationalObjectives from '../../models/Syllabus/studentEducationalObjectives.js';
import SyllabusApprovalStatus from '../../models/Syllabus/syllabusApprovalStatus.js';

const newSyllabusRoutes = express.Router();

// Multer configuration for image handling
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * GET: Render the "Add New Syllabus" page
 */
newSyllabusRoutes.get('/:syllabusId', async (req, res) => {
    try {
        const userRole = (req.session.user && req.session.user.role) ? req.session.user.role.toLowerCase() : '';


        const syllabusId = req.params.syllabusId;
        console.log(`DEBUG: Reached newSyllabusRoutes GET /:syllabusId with ID: ${syllabusId}`);

        let peos = await ProgramEducationalObjectives.findOne({ syllabusID: syllabusId });
        let sos = await StudentEducationalObjectives.findOne({ syllabusID: syllabusId });

        // Fall back to admin global template only when BOTH are absent for this syllabus.
        // Never partially merge template + existing data.
        if (!peos && !sos) {
            const template = await Syllabus.findOne({ courseCode: '__GLOBAL_TEMPLATE__' });
            if (template) {
                peos = await ProgramEducationalObjectives.findOne({ syllabusID: template._id });
                sos = await StudentEducationalObjectives.findOne({ syllabusID: template._id });
            }
        }

        // Check if syllabus is submitted to enforce lock
        let isPeoSoLocked = false;
        const approval = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId });
        const lockedStatuses = ["Endorsed", "Approved", "Archived"];
        if (approval && approval.status && lockedStatuses.includes(approval.status)) {
            isPeoSoLocked = true;
        }

        const isGlobalTemplate = req.query.isGlobal === 'true';

        res.render('Syllabus/newSyllabus', {
            currentPageCategory: "syllabus",
            syllabusId: syllabusId,
            peos: peos || null,
            sos: sos || null,
            isPeoSoLocked: isPeoSoLocked,
            isGlobalTemplate: isGlobalTemplate
        });
    } catch (err) {
        console.error("Error fetching PEOs/SOs:", err);
        res.render('Syllabus/newSyllabus', {
            currentPageCategory: "syllabus",
            syllabusId: req.params.syllabusId,
            peos: null,
            sos: null,
            isPeoSoLocked: false
        });
    }
});

/**
 * POST: Save the new syllabus to MongoDB
 */
newSyllabusRoutes.post('/add', upload.single('courseImage'), async (req, res) => {
    try {
        const userRole = (req.session.user && req.session.user.role) ? req.session.user.role.toLowerCase() : '';


        const { courseCode, courseTitle, userId } = req.body;
        const syllabusData = {
            userID: userId,
            courseCode,
            courseTitle
        };

        // If an image was uploaded, convert it to base64 for MongoDB
        if (req.file) {
            const base64 = req.file.buffer.toString('base64');
            syllabusData.courseImage = `data:${req.file.mimetype};base64,${base64}`;
        }

        const newSyllabus = new Syllabus(syllabusData);
        await newSyllabus.save();
        res.redirect(`/syllabus/${userId}`);
    } catch (error) {
        console.error("Error saving syllabus:", error);
        res.status(500).send("Server Error: Could not save course.");
    }
});

/**
 * POST: API to save the global template PEOs and SOs directly
 */
newSyllabusRoutes.post('/api/global-template', express.json(), async (req, res) => {
    try {
        let template = await Syllabus.findOne({ courseCode: '__GLOBAL_TEMPLATE__' });
        if (!template) {
            template = new Syllabus({
                courseCode: '__GLOBAL_TEMPLATE__',
                courseTitle: 'Global Standard Template',
                userID: req.session?.user?.id || 'admin'
            });
            await template.save();
        }

        const syllabusId = template._id.toString();
        const { programObjectives, programObjectivesRating, studentObjectives, studentObjectivesRating } = req.body;

        // Upsert PEOs
        if (programObjectives && programObjectives.length > 0) {
            await ProgramEducationalObjectives.findOneAndUpdate(
                { syllabusID: syllabusId },
                { 
                    $set: { 
                        description: programObjectives,
                        rating: (programObjectivesRating && programObjectivesRating.length > 0) ? programObjectivesRating : Array(programObjectives.length).fill("I")
                    } 
                },
                { upsert: true }
            );
        }

        // Upsert SOs
        if (studentObjectives && studentObjectives.length > 0) {
            await StudentEducationalObjectives.findOneAndUpdate(
                { syllabusID: syllabusId },
                {
                    $set: {
                        description: studentObjectives,
                        rating: (studentObjectivesRating && studentObjectivesRating.length > 0) ? studentObjectivesRating : Array(studentObjectives.length).fill("I")
                    }
                },
                { upsert: true }
            );
        }

        res.json({ success: true, message: 'Global Template updated.' });
    } catch (err) {
        console.error('Error updating global template:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default newSyllabusRoutes;