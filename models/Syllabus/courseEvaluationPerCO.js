import { Schema } from "mongoose";
import { mainDB } from "../../database/mongo-dbconnect.js";

const courseEvaluationPerCOSchema = new Schema({
  syllabusID: { type: Schema.Types.ObjectId, ref: "Syllabus", required: true },
  coNumber: String,
  moduleCode: String,
  onlineTaskWeight: Number,
  longExaminationWeight: Number,
  finalProjectWeight: Number,
  moduleWeight: Number,
  finalWeight: Number,
  mediatingOutcome: String,
  studentsPassed: { type: Number, default: 0 },
  studentsFailed: { type: Number, default: 0 },
  analysis: { type: String, default: "" }
});

const CourseEvaluationPerCO = mainDB.models.CourseEvaluationPerCO || mainDB.model("CourseEvaluationPerCO", courseEvaluationPerCOSchema);
export default CourseEvaluationPerCO;