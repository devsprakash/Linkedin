// models/Skill.js
const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Skill name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Skill name cannot exceed 50 characters']
  },
  
  category: {
    type: String,
    enum: ['technical', 'soft', 'language', 'tool', 'framework', 'database', 'cloud', 'other'],
    default: 'other'
  },
  
  endorsements: {
    type: Number,
    default: 0
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index
skillSchema.index({ name: 'text' });

const Skill = mongoose.model('Skill', skillSchema);
module.exports = Skill;