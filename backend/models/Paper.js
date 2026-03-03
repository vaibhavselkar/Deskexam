const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Untitled Paper' },
    subject: { type: String, default: 'Mathematics' },
    className: { type: String, default: 'Class X' },
    maxMarks: { type: Number, default: 80 },
    timeDuration: { type: String, default: '3 Hours' },
    instituteName: { type: String, default: '' },
    teacherName: { type: String, default: '' },
    questions: { type: mongoose.Schema.Types.Mixed, default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Paper', paperSchema);
