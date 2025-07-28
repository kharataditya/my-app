const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Use the MongoDB URI from environment variables or use a local MongoDB instance
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/couple-chat';
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`Error connecting to MongoDB: ${err.message}`);
    // Continue without database if connection fails
    console.log('Continuing without database persistence...');
    return null;
  }
};

module.exports = connectDB;