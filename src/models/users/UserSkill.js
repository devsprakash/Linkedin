// models/UserSkill.js
const mongoose = require('mongoose');

const userSkillSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  skill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: [true, 'Skill ID is required']
  },
  
  skillName: {
    type: String,
    required: [true, 'Skill name is required']
  },
  
  endorsements: [{
    endorsedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    endorsedAt: {
      type: Date,
      default: Date.now
    },
    experience: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Experience'
    }
  }],
  
  endorsementCount: {
    type: Number,
    default: 0
  },
  
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate'
  },
  
  isTopSkill: {
    type: Boolean,
    default: false
  },
  
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure one user can't have the same skill twice
userSkillSchema.index({ user: 1, skill: 1 }, { unique: true });

// Pre-save middleware to update endorsement count
userSkillSchema.pre('save', function(next) {
  this.endorsementCount = this.endorsements.length;
  next();
});

const UserSkill = mongoose.model('UserSkill', userSkillSchema);
module.exports = UserSkill;