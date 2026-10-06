const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MONGODB_URI is missing from your .env file");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      maxPoolSize: 50,          // max simultaneous connections
      minPoolSize: 5,           // keep 5 warm connections ready
      serverSelectionTimeoutMS: 5000,   // fail fast if Atlas is unreachable
      socketTimeoutMS: 45000,   // close idle sockets after 45s
    });
    console.log("MongoDB connected:", mongoose.connection.name);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
