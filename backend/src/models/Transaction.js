import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },

    // ✅ Recurring fields
    isRecurring: { type: Boolean, default: false },
    frequency: { type: String, enum: ["weekly", "monthly"], default: "monthly" },

    // Optional: original recurring template id (helps avoid duplicates)
    recurringGroupId: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);