import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./src/models/User.js";

dotenv.config();

const email = "satishreddyp36@gmail.com";
const newPassword = "Satish36"; // <-- make sure this matches what you will type in login

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Mongo connected");

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    console.log("✅ Password reset done for:", email);
    process.exit(0);
  } catch (err) {
    console.error("❌ Reset error:", err.message);
    process.exit(1);
  }
};

run();