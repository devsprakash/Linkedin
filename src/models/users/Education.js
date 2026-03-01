// models/Education.js
const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  school: {
    type: String,
    required: [true, 'School name is required'],
    trim: true,
    maxlength: [100, 'School name cannot exceed 100 characters']
  },
  
  degree: {
    type: String,
    trim: true,
    maxlength: [100, 'Degree cannot exceed 100 characters']
  },
  
  fieldOfStudy: {
    type: String,
    trim: true,
    maxlength: [100, 'Field of study cannot exceed 100 characters']
  },
  
  grade: {
    type: String,
    trim: true,
    maxlength: [20, 'Grade cannot exceed 20 characters']
  },
  
  activities: {
    type: String,
    trim: true,
    maxlength: [500, 'Activities cannot exceed 500 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  startDate: {
    month: {
      type: String,
      enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    },
    year: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear() + 10
    }
  },
  
  endDate: {
    month: {
      type: String,
      enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    },
    year: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear() + 10
    }
  },
  
  current: {
    type: Boolean,
    default: false
  },
  
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document', 'link']
    },
    url: String,
    title: String
  }],
  
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for duration
educationSchema.virtual('duration').get(function() {
  if (!this.startDate.year) return null;
  
  const endYear = this.current ? new Date().getFullYear() : (this.endDate?.year || this.startDate.year);
  return endYear - this.startDate.year;
});

// Indexes
educationSchema.index({ user: 1, endDate: -1 });

const Education = mongoose.model('Education', educationSchema);
module.exports = Education;