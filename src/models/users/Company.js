// models/Company.js
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  
  website: {
    type: String,
    trim: true,
    match: [/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, 'Please provide a valid URL']
  },
  
  industry: {
    type: String,
    trim: true
  },
  
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+']
  },
  
  founded: {
    type: Number,
    min: 1600,
    max: new Date().getFullYear()
  },
  
  headquarters: {
    city: String,
    country: String,
    address: String
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  logo: {
    type: String,
    default: 'default-company-logo.jpg'
  },
  
  coverImage: String,
  
  specialties: [String],
  
  followers: {
    type: Number,
    default: 0
  },
  
  employees: {
    type: Number,
    default: 0
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  socialLinks: {
    linkedin: String,
    twitter: String,
    facebook: String,
    instagram: String
  }
}, {
  timestamps: true
});

// Index for search
companySchema.index({ name: 'text', description: 'text' });

const Company = mongoose.model('Company', companySchema);
module.exports = Company;