const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function test() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not found in .env.local");
    process.exit(1);
  }
  console.log("Connecting to MongoDB...");
  console.log("URI:", uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@"));
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ MongoDB connected successfully");
    console.log("Database:", mongoose.connection.db.databaseName);
    console.log("Host:", mongoose.connection.host);
    await mongoose.disconnect();
    console.log("Disconnected");
    process.exit(0);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

test();
