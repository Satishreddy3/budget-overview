import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: { type: String, enum: ["income", "expense"], required: true },

    // ✅ NEW: merchant / item name
    merchant: { type: String, default: "" },

    // ✅ category remains category
    category: { type: String, default: "Other" },

    amount: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);