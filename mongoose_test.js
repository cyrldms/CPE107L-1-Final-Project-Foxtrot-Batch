const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect('mongodb://127.0.0.1:27017/test_db').then(async () => {
    const TestSchema = new Schema({
        classSchedule: Number
    });
    const TestModel = mongoose.model('TestClass', TestSchema);
    
    try {
        const doc = new TestModel({ classSchedule: "Lecture: 3 hrs/week" });
        await doc.save();
        console.log("Saved successfully!");
    } catch (e) {
        console.log("Failed to save:", e.message);
    }
    mongoose.disconnect();
});
