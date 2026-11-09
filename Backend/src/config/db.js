// Backend/src/config/db.js
import mongoose from 'mongoose';

// Cache connection across serverless invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // Return existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // Reuse pending connection promise (prevents duplicate connections)
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,        // Important for serverless
      minPoolSize: 0,
      bufferCommands: false,  // Fail fast instead of buffering silently
    }).then((mongooseInstance) => {
      console.log(`✅ MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    }).catch((err) => {
      cached.promise = null;  // Reset so next request retries
      console.error(`❌ MongoDB Connection Error: ${err.message}`);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ Mongoose disconnected');
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose runtime error:', err.message);
});

export default connectDB;