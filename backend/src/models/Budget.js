import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    category: { type: String, required: true, trim: true },
    limit: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

// One budget per user+month+year+category
budgetSchema.index({ user: 1, month: 1, year: 1, category: 1 }, { unique: true });

export default mongoose.model("Budget", budgetSchema);