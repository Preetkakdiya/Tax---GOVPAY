const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  target_audience: { 
    type: String, 
    enum: ['all', 'company', 'employee'], 
    default: 'all',
    required: true
  },
  author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Announcement', announcementSchema);
