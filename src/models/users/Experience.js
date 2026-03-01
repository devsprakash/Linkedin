// models/Experience.js
const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'self-employed', 'freelance', 'contract', 'internship', 'apprenticeship'],
    default: 'full-time'
  },
  
  location: {
    city: String,
    country: String,
    remote: {
      type: Boolean,
      default: false
    }
  },
  
  locationType: {
    type: String,
    enum: ['on-site', 'hybrid', 'remote'],
    default: 'on-site'
  },
  
  startDate: {
    month: {
      type: String,
      enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      required: [true, 'Start month is required']
    },
    year: {
      type: Number,
      required: [true, 'Start year is required'],
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
  
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  highlights: [{
    type: String,
    trim: true,
    maxlength: [300, 'Highlight cannot exceed 300 characters']
  }],
  
  skills: [{
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill'
    },
    name: String,
    endorsed: {
      type: Number,
      default: 0
    }
  }],
  
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document', 'link'],
      default: 'image'
    },
    url: String,
    title: String
  }],
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verificationMethod: {
    type: String,
    enum: ['email', 'work_email', 'document', 'linkedin']
  },
  
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for duration
experienceSchema.virtual('duration').get(function() {
  const start = new Date(this.startDate.year, this.getMonthNumber(this.startDate.month));
  const end = this.current ? new Date() : new Date(this.endDate.year, this.getMonthNumber(this.endDate.month));
  
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  
  let totalMonths = years * 12 + months;
  const displayYears = Math.floor(totalMonths / 12);
  const displayMonths = totalMonths % 12;
  
  if (displayYears > 0 && displayMonths > 0) {
    return `${displayYears} yr ${displayMonths} mos`;
  } else if (displayYears > 0) {
    return `${displayYears} yr${displayYears > 1 ? 's' : ''}`;
  } else {
    return `${displayMonths} mo${displayMonths > 1 ? 's' : ''}`;
  }
});

experienceSchema.methods.getMonthNumber = function(monthName) {
  const months = {
    'January': 0, 'February': 1, 'March': 2, 'April': 3,
    'May': 4, 'June': 5, 'July': 6, 'August': 7,
    'September': 8, 'October': 9, 'November': 10, 'December': 11
  };
  return months[monthName] || 0;
};

// Indexes
experienceSchema.index({ user: 1, current: -1, startDate: -1 });
experienceSchema.index({ company: 1 });

const Experience = mongoose.model('Experience', experienceSchema);
module.exports = Experience;