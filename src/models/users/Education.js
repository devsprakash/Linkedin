// models/Education.js
const mongoose = require('mongoose');

const educationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  school: {
    type: String,
    trim: true,
  },
  
  degree: {
    type: String,
    trim: true,
  },
  
  fieldOfStudy: {
    type: String,
    trim: true,
  },
  
  grade: {
    type: String,
    trim: true,
  },
  
  activities: {
    type: String,
    trim: true,
  },
  
  description: {
    type: String,
    trim: true,
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