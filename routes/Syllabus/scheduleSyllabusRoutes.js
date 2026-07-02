import express from 'express';
import mongoose from 'mongoose';
import { mainDB } from '../../database/mongo-dbconnect.js';

// Import all Syllabus models
import Syllabus from '../../models/Syllabus/syllabus.js';
import ProgramEducationalObjectives from '../../models/Syllabus/programEducationObjectives.js';
import StudentEducationalObjectives from '../../models/Syllabus/studentEducationalObjectives.js';
import CourseOutcomes from '../../models/Syllabus/courseOutcomes.js';
import CourseMapping from '../../models/Syllabus/courseMapping.js';
import WeeklySchedule from '../../models/Syllabus/weeklySchedule.js';
import CourseEvaluationPerCO from '../../models/Syllabus/courseEvaluationPerCO.js';
import SyllabusApprovalStatus from '../../models/Syllabus/syllabusApprovalStatus.js';

const scheduleSyllabusRoutes = express.Router();

scheduleSyllabusRoutes.get('/:syllabusId', async (req, res) => {
    try {
        const syllabusId = req.params.syllabusId;
        const schedules = await WeeklySchedule.find({ syllabusID: syllabusId }).sort({ week: 1 });
        const evaluation = await CourseEvaluationPerCO.find({ syllabusID: syllabusId });
        const courseOutcomes = await CourseOutcomes.find({ syllabusID: syllabusId });
        const approvalData = await SyllabusApprovalStatus.findOne({ syllabusID: syllabusId });

        res.render('Syllabus/scheduleSyllabus', {
            currentPageCategory: "syllabus",
            syllabusId: syllabusId,
            schedules: schedules || [],
            evaluation: evaluation || [],
            assessment: courseOutcomes || [],
            approvalStatus: approvalData ? approvalData.status : 'Not Submitted',
            userRole: req.session.user ? req.session.user.role : '',
            userId: req.session.user ? req.session.user.id : ''
        });
    } catch (err) {
        console.error("Error fetching schedule/evaluation:", err);
        res.render('Syllabus/scheduleSyllabus', {
            currentPageCategory: "syllabus",
            syllabusId: req.params.syllabusId,
            schedules: [],
            evaluation: [],
            assessment: [],
            userRole: req.session.user ? req.session.user.role : '',
            userId: req.session.user ? req.session.user.id : ''
        });
    }
});

scheduleSyllabusRoutes.post('/submit', async (req, res) => {
    try {
        const payload = req.body;
        console.log("RECEIVED PAYLOAD FROM FRONTEND:", JSON.stringify({
            hasBasicInfo: !!payload.basicInfo,
            hasId: !!payload.syllabusId,
            syllabusIdValue: payload.syllabusId
        }));

        const syllabusID = payload.syllabusId;
        if (!syllabusID) {
            return res.status(400).json({ success: false, error: "Missing course ID from payload." });
        }

        const existingSyllabus = await Syllabus.findById(syllabusID);
        if (!existingSyllabus) {
            return res.status(404).json({ success: false, error: "Course not found in database." });
        }

        // 1. Update existing main Syllabus document
        existingSyllabus.courseCode = payload.basicInfo.courseCode || existingSyllabus.courseCode;
        existingSyllabus.courseTitle = payload.basicInfo.courseTitle || existingSyllabus.courseTitle;
        existingSyllabus.preRequisite = payload.basicInfo.preRequisite || "";
        existingSyllabus.coRequisite = payload.basicInfo.coRequisite || "";
        existingSyllabus.units = parseFloat(payload.basicInfo.units) || existingSyllabus.units || 0;
        existingSyllabus.lectureHours = parseFloat(payload.basicInfo.lectureHours) || existingSyllabus.lectureHours || 0;
        existingSyllabus.labHours = parseFloat(payload.basicInfo.labHours) || existingSyllabus.labHours || 0;
        existingSyllabus.courseDesign = payload.basicInfo.courseDesign || "";
        existingSyllabus.courseDescription = payload.basicInfo.courseDescription || "";
        existingSyllabus.term = payload.basicInfo.term || "";
        existingSyllabus.schoolYear = payload.basicInfo.schoolYear || "";
        existingSyllabus.programPreparedFor = payload.basicInfo.programPreparedFor || "";
        existingSyllabus.textbook = payload.basicInfo.textbook || "";
        existingSyllabus.references = payload.basicInfo.references || "";

        if (payload.conceptMap) {
            existingSyllabus.conceptMap = payload.conceptMap;
        }

        await existingSyllabus.save();

        // Clean out any old dependent drafts so they don't multiply infinitely
        await ProgramEducationalObjectives.deleteMany({ syllabusID });
        await StudentEducationalObjectives.deleteMany({ syllabusID });
        await CourseOutcomes.deleteMany({ syllabusID });
        await CourseMapping.deleteMany({ syllabusID });
        await WeeklySchedule.deleteMany({ syllabusID });
        await CourseEvaluationPerCO.deleteMany({ syllabusID });
        await SyllabusApprovalStatus.deleteMany({ syllabusID });

        // 2. Save Program Educational Objectives
        if (payload.programObjectives && payload.programObjectives.length > 0) {
            const peo = new ProgramEducationalObjectives({
                syllabusID,
                description: payload.programObjectives,
                rating: (payload.programObjectivesRating && payload.programObjectivesRating.length > 0) ? payload.programObjectivesRating : Array(payload.programObjectives.length).fill("I") // Default rating
            });
            await peo.save();
        }

        // 2.5 Save Student Educational Objectives
        if (payload.studentObjectives && payload.studentObjectives.length > 0) {
            const seo = new StudentEducationalObjectives({
                syllabusID,
                description: payload.studentObjectives,
                rating: (payload.studentObjectivesRating && payload.studentObjectivesRating.length > 0) ? payload.studentObjectivesRating : Array(payload.studentObjectives.length).fill("I")
            });
            await seo.save();
        }

        // 3. Save Course Outcomes
        if (payload.courseOutcomesEditor && payload.courseOutcomesEditor.length > 0) {
            let assessmentIndex = 0;
            for (const co of payload.courseOutcomesEditor) {
                let assessmentTask = payload.courseOutcomesAssessment?.find(a => {
                    const aNum = (a.coNumber || '').replace(/\D/g, '');
                    const coNum = (co.coNumber || '').replace(/\D/g, '');
                    if (aNum && coNum) return aNum === coNum;
                    return (a.coNumber || '').trim() === (co.coNumber || '').trim();
                });

                // Fallback to row index if the user typed non-matching labels like 'CO. test'
                if (!assessmentTask && payload.courseOutcomesAssessment && payload.courseOutcomesAssessment.length > assessmentIndex) {
                    assessmentTask = payload.courseOutcomesAssessment[assessmentIndex];
                }

                const newCo = new CourseOutcomes({
                    syllabusID,
                    coNumber: co.coNumber,
                    description: [co.description],
                    thinkingSkills: [co.thinkingSkills],
                    assessmentTasks: assessmentTask ? assessmentTask.assessmentTasks : '',
                    minSatisfactoryPerf: assessmentTask ? (parseFloat(assessmentTask.minSatisfactoryPerf) || 0) : 0
                });
                await newCo.save();
                assessmentIndex++;
            }
        }

        // 4. Save Course Mapping
        if (payload.courseMapping && payload.courseMapping.length > 0) {
            for (const map of payload.courseMapping) {
                const newMapping = new CourseMapping({
                    syllabusID,
                    numberOfCO: parseInt(map.coNumber.replace(/\D/g, '')) || 0,
                    program: "Engineering", // Default based on placeholder
                    fromAtoL: map.alignments
                });
                await newMapping.save();
            }
        }

        // 5. Save Weekly Schedule
        if (payload.weeklySchedule && payload.weeklySchedule.length > 0) {
            for (const sched of payload.weeklySchedule) {
                const newSched = new WeeklySchedule({
                    syllabusID,
                    week: parseInt(sched.week) || 0,
                    outcomeCo: parseInt(sched.coNumber.replace(/\D/g, '')) || 0,
                    outcomeMo: sched.moNumber,
                    outcomeIlo: sched.iloNumber,
                    coverageDay: parseInt(sched.coverageDay) || 0,
                    coverageTopic: sched.coverageTopic,
                    tlaMode: sched.tlaMode,
                    tlaActivities: sched.tlaActivities,
                    assessmentTaskMode: sched.assessmentTaskMode,
                    assessmentTaskTask: sched.assessmentTaskTask,
                    referenceNum: sched.referenceNum,
                    dateCovered: sched.dateCovered
                });
                await newSched.save();
            }
        }

        // 6. Save Course Evaluation
        if (payload.courseEvaluation && payload.courseEvaluation.length > 0) {
            for (const evalEntry of payload.courseEvaluation) {
                const newEval = new CourseEvaluationPerCO({
                    syllabusID,
                    coNumber: evalEntry.coNumber,
                    moduleCode: evalEntry.moduleCode,
                    // Parse weights safely
                    onlineTaskWeight: parseFloat(evalEntry.assessmentWeightLT) || 0,
                    longExaminationWeight: parseFloat(evalEntry.assessmentWeightPE) || 0,
                    moduleWeight: parseFloat(evalEntry.modularWeight) || 0,
                    finalWeight: parseFloat(evalEntry.finalWeight) || 0,
                    mediatingOutcome: evalEntry.mediatingOutcome || ""
                });
                await newEval.save();
            }
        }

        // 7. Create Approval Status — auto-skip based on submitter role
        const userRole = (req.session?.user?.role || '').toLowerCase();
        const userName = req.session?.user
            ? `${req.session.user.firstName || ''} ${req.session.user.lastName || ''}`.trim()
            : '';
        const reqSignatoryName = req.body.signatoryName || '';
        const reqSignatureData = req.body.signatureData || null;
        const reqActionType = req.body.actionType || 'submit';

        let initialStatus = 'Pending Endorsement';
        let initialRemarks = 'Syllabus Initial Submission';
        const approvalData = { syllabusID };

        if (reqActionType === 'draft') {
            initialStatus = 'Draft';
            initialRemarks = 'Saved as Draft';
        } else if (userRole === 'program-chair') {
            initialStatus = 'Draft';
            initialRemarks = 'Awaiting Faculty Signature';
        } else if (userRole === 'faculty' || userRole === 'professor') {
            initialStatus = 'Draft';
            initialRemarks = 'Saved as Draft';
        } else if (userRole === 'dean') {
            // Dean submits → auto-endorse + auto-approve, skip to HR
            initialStatus = 'Approved';
            initialRemarks = 'Auto-approved (submitted by Dean)';
            approvalData.approvedBy = 'Dean';
            approvalData.approvalDate = new Date();
            approvalData.PC_Remarks = 'Auto-endorsed (submitted by Dean)';
            approvalData.PC_SignatoryName = reqSignatoryName || userName;
            approvalData.PC_Signature = reqSignatureData;
            approvalData.Dean_Remarks = 'Auto-approved by Dean';
            approvalData.Dean_SignatoryName = reqSignatoryName || userName;
            approvalData.Dean_Signature = reqSignatureData;
            
            // Apply signature to Faculty "Prepared By" as well
            approvalData.Faculty_SignatoryName = reqSignatoryName || userName;
            approvalData.Faculty_Signature = reqSignatureData;
        }

        approvalData.status = initialStatus;
        approvalData.remarks = initialRemarks;
        
        await SyllabusApprovalStatus.findOneAndUpdate(
            { syllabusID: syllabusID },
            { $set: approvalData },
            { upsert: true, new: true }
        );

        res.json({ success: true, syllabusId: syllabusID });
    } catch (error) {
        console.error("Error in /syllabus/schedule/submit:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

scheduleSyllabusRoutes.post('/update-date-covered', async (req, res) => {
    try {
        const { syllabusID, dates } = req.body;
        if (!syllabusID || !dates) {
            return res.status(400).json({ success: false, error: "Missing payload data." });
        }

        // Fetch existing schedule
        const schedules = await WeeklySchedule.find({ syllabusID }).sort({ week: 1 });
        
        for (let i = 0; i < schedules.length; i++) {
            if (dates[i] !== undefined) {
                schedules[i].dateCovered = dates[i];
                await schedules[i].save();
            }
        }

        return res.status(200).json({ success: true, message: "Date Covered updated successfully." });
    } catch (err) {
        console.error("Error updating Date Covered:", err);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

scheduleSyllabusRoutes.get('/api/co-report/:syllabusId', async (req, res) => {
    try {
        const syllabusId = req.params.syllabusId;
        const evaluation = await CourseEvaluationPerCO.find({ syllabusID: syllabusId });
        const outcomes = await CourseOutcomes.find({ syllabusID: syllabusId });

        return res.status(200).json({ success: true, evaluation, outcomes });
    } catch (err) {
        console.error("Error fetching CO Report data:", err);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

scheduleSyllabusRoutes.post('/update-co-report', async (req, res) => {
    try {
        const { syllabusID, coData } = req.body;
        if (!syllabusID || !coData) {
            return res.status(400).json({ success: false, error: "Missing payload data." });
        }

        for (const data of coData) {
            await CourseEvaluationPerCO.findByIdAndUpdate(data.id, {
                studentsPassed: parseInt(data.passed) || 0,
                studentsFailed: parseInt(data.failed) || 0,
                analysis: data.analysis || ""
            });
        }

        return res.status(200).json({ success: true, message: "CO Report updated successfully." });
    } catch (err) {
        console.error("Error updating CO Report:", err);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
});

export default scheduleSyllabusRoutes;