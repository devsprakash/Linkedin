// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Info
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  additionalName: {
    type: String,
    trim: true,
    maxlength: [100, 'Additional name cannot exceed 100 characters']
  },
  headline: {
    type: String,
    required: [true, 'Headline is required'],
    trim: true,
    maxlength: [200, 'Headline cannot exceed 200 characters']
  },
  pronouns: {
    type: String,
    enum: ['he/him', 'she/her', 'they/them', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },
  customPronouns: {
    type: String,
    trim: true,
    maxlength: [20, 'Custom pronouns cannot exceed 20 characters']
  },
  
  // Contact Info
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please provide a valid phone number']
  },
  phoneType: {
    type: String,
    enum: ['work', 'personal', 'home', 'other'],
    default: 'work'
  },
  birthday: {
    month: {
      type: String,
      enum: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    },
    day: {
      type: Number,
      min: 1,
      max: 31
    },
    year: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear()
    },
    showYear: {
      type: Boolean,
      default: false
    }
  },
  
  // Profile URLs
  profileUrl: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  website: {
    type: String,
    trim: true,
    match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'Please provide a valid URL']
  },
  companyWebsite: {
    type: String,
    trim: true
  },
  
  // Location
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  
  // Professional Info
  currentCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Experience'
  },
  showCurrentCompany: {
    type: Boolean,
    default: true
  },
  industry: {
    type: String,
    required: [true, 'Industry is required'],
    trim: true
  },
  
  // Stats
  followers: {
    type: Number,
    default: 0
  },
  connections: {
    type: Number,
    default: 0
  },
  profileViews: {
    type: Number,
    default: 0
  },
  postImpressions: {
    type: Number,
    default: 0
  },
  searchAppearances: {
    type: Number,
    default: 0
  },
  
  // About/Bio
  about: {
    type: String,
    trim: true,
    maxlength: [2000, 'About cannot exceed 2000 characters']
  },
  
  // Profile completion
  profileCompleteness: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationBadge: {
    type: String,
    enum: ['none', 'email', 'phone', 'work', 'id'],
    default: 'none'
  },
  
  // Settings
  isOpenToWork: {
    type: Boolean,
    default: false
  },
  openToSettings: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OpenToWork'
  },
  
  // Auth
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Virtual for birthday display
userSchema.virtual('birthdayDisplay').get(function() {
  if (!this.birthday.month || !this.birthday.day) return null;
  let display = `${this.birthday.month} ${this.birthday.day}`;
  if (this.birthday.year && this.birthday.showYear) {
    display += `, ${this.birthday.year}`;
  }
  return display;
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance methods
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Calculate profile completeness
userSchema.methods.calculateCompleteness = function() {
  let score = 0;
  const total = 10; // Number of sections
  
  if (this.firstName && this.lastName) score++;
  if (this.headline) score++;
  if (this.email) score++;
  if (this.country) score++;
  if (this.industry) score++;
  if (this.about && this.about.length > 50) score++;
  if (this.profilePhoto) score++;
  if (this.experience && this.experience.length > 0) score++;
  if (this.education && this.education.length > 0) score++;
  if (this.skills && this.skills.length > 0) score++;
  
  this.profileCompleteness = (score / total) * 100;
  return this.profileCompleteness;
};

const User = mongoose.model('User', userSchema);
module.exports = User;