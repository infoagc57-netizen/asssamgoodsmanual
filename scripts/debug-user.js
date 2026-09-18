const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: ".env.local" });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.collection("users").find({}).toArray();
  console.log("Total users:", users.length);
  
  for (const u of users) {
    console.log("---");
    console.log("Email:", u.email);
    console.log("Role:", u.role);
    console.log("Status:", u.status);
    console.log("Has passwordHash:", Boolean(u.passwordHash));
    console.log("Hash length:", u.passwordHash ? u.passwordHash.length : 0);
    console.log("Hash prefix:", u.passwordHash ? u.passwordHash.substring(0, 10) : "NONE");
    
    if (u.passwordHash && u.email === "admin@agc.local") {
      const match = await bcrypt.compare("admin123", u.passwordHash);
      console.log("Password 'admin123' matches?", match);
    }
  }
  
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
