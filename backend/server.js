import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";

import authRoutes from "./src/routes/authRoutes.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";
import budgetRoutes from "./src/routes/budgetRoutes.js"; // ✅ ADD THIS

dotenv.config();
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
connectDB();

app.get("/", (req, res) => {
  res.send("BudgetBot backend is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes); // ✅ ADD THIS

const PORT = 5001;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);