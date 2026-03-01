// models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  
  content: {
    type: String,
    required: [true, 'Post content is required'],
    trim: true,
    maxlength: [3000, 'Post cannot exceed 3000 characters']
  },
  
  preview: {
    type: String,
    trim: true,
    maxlength: [200, 'Preview cannot exceed 200 characters']
  },
  
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'document', 'link'],
      default: 'image'
    },
    url: String,
    thumbnail: String,
    title: String,
    description: String
  }],
  
  hashtags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Hashtag cannot exceed 50 characters']
  }],
  
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  }],
  
  stats: {
    likes: {
      type: Number,
      default: 0
    },
    comments: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    impressions: {
      type: Number,
      default: 0
    }
  },
  
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  visibility: {
    type: String,
    enum: ['public', 'connections', 'private'],
    default: 'public'
  },
  
  isPinned: {
    type: Boolean,
    default: false
  },
  
  pinnedAt: Date,
  
  postedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for search
postSchema.index({ content: 'text', hashtags: 'text' });
postSchema.index({ user: 1, postedAt: -1 });

const Post = mongoose.model('Post', postSchema);
module.exports = Post;