// Backend/test-db.js
import 'dotenv/config';
import mongoose from 'mongoose';

console.log('MONGO_URI set?', !!process.env.MONGO_URI);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL:', process.env.VERCEL);

try {
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log('✅ Connected to:', mongoose.connection.host);
  console.log('📂 Database name:', mongoose.connection.name);
  await mongoose.disconnect();
  console.log('✅ Disconnected cleanly');
} catch (e) {
  console.error('❌ Connection failed:');
  console.error('   message:', e.message);
  console.error('   code:', e.code);
  console.error('   reason:', e.reason?.type || e.reason);
}