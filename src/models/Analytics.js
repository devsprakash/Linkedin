// models/Analytics.js
const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  
  profileViews: {
    type: Number,
    default: 0
  },
  
  profileViewers: [{
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['search', 'direct', 'post', 'connection', 'other'],
      default: 'direct'
    }
  }],
  
  postImpressions: {
    type: Number,
    default: 0
  },
  
  postEngagements: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 }
  },
  
  searchAppearances: {
    type: Number,
    default: 0
  },
  
  searchKeywords: [{
    keyword: String,
    count: Number
  }],
  
  connectionRequests: {
    sent: { type: Number, default: 0 },
    received: { type: Number, default: 0 },
    accepted: { type: Number, default: 0 }
  },
  
  messagesReceived: {
    type: Number,
    default: 0
  },
  
  messagesSent: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for date range queries
analyticsSchema.index({ user: 1, date: -1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);
module.exports = Analytics;