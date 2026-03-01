import mongoose from 'mongoose';
import logger from './logger.js';

const connectDB = async () => {
  try {
    // Direct connection string
    const mongoURI = "mongodb+srv://root:akki909@cluster0.sm3rshd.mongodb.net/ProConnect?retryWrites=true&w=majority";
    
    logger.info('Connecting to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return conn;
  } catch (error) {
    logger.error('Database connection error:', error);
    process.exit(1);
  }
};

export default connectDB;