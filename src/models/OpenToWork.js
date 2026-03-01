// models/OpenToWork.js
const mongoose = require('mongoose');

const openToWorkSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true
  },
  
  jobTitles: [{
    type: String,
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  }],
  
  jobTypes: [{
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote', 'hybrid']
  }],
  
  locations: [{
    city: String,
    country: String,
    remote: Boolean
  }],
  
  startDate: {
    type: String,
    enum: ['immediately', 'two_weeks', 'one_month', 'three_months', 'flexible']
  },
  
  industries: [String],
  
  skills: [{
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill'
    },
    name: String
  }],
  
  visibility: {
    type: String,
    enum: ['all', 'recruiters_only', 'connections_only'],
    default: 'all'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const OpenToWork = mongoose.model('OpenToWork', openToWorkSchema);
module.exports = OpenToWork;