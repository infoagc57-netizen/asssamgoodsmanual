const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not found");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");
  const User = mongoose.connection.collection("users");
  const email = "admin@agc.in";
  if (await User.findOne({ email })) {
    console.log("Admin already exists:", email);
    await mongoose.disconnect();
    process.exit(0);
  }
  const passwordHash = await bcrypt.hash("admin123", 10);
  await User.insertOne({
    name: "Admin",
    email,
    phone: "9999999999",
    role: "admin",
    status: "active",
    passwordHash,
    failedLoginCount: 0,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log("Admin created: admin@agc.in / admin123");
  await mongoose.disconnect();
  process.exit(0);
}
seed().catch((err) => { console.error(err.message); process.exit(1); });
