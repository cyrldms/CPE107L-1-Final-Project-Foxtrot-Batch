import mongoose from 'mongoose';
mongoose.connect('mongodb://127.0.0.1:27017/CPE107L').then(async () => {
  const docs = await mongoose.connection.db.collection('syllabusapprovalstatuses').find({}).toArray();
  const filtered = docs.filter(r => r.sectionComments && r.sectionComments.length > 0);
  console.log(JSON.stringify(filtered, null, 2));
  mongoose.connection.close();
});
