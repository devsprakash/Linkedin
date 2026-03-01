// models/Language.js
const mongoose = require('mongoose');

const languageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  name: {
    type: String,
    required: [true, 'Language name is required'],
    trim: true,
    maxlength: [50, 'Language name cannot exceed 50 characters']
  },
  
  proficiency: {
    type: String,
    enum: ['elementary', 'limited_working', 'professional_working', 'full_professional', 'native'],
    required: [true, 'Proficiency level is required']
  },
  
  canRead: {
    type: Boolean,
    default: true
  },
  
  canWrite: {
    type: Boolean,
    default: true
  },
  
  canSpeak: {
    type: Boolean,
    default: true
  },
  
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Ensure one user can't have the same language twice
languageSchema.index({ user: 1, name: 1 }, { unique: true });

const Language = mongoose.model('Language', languageSchema);
module.exports = Language;