import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import Syllabus from './models/Syllabus/syllabus.js';

mongoose.connect(process.env.MONGO_URI, { dbName: 'mainDB' }).then(async () => {
    try {
        const values = await Syllabus.distinct('courseDesign');
        console.log("DISTINCT courseDesign VALUES:", values);
    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
});
