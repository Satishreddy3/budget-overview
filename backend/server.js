import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import authRoutes from "./src/routes/authRoutes.js";
import budgetRoutes from "./src/routes/budgetRoutes.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";

dotenv.config();

const app = express();

/** ---------------------------
 *  CORS (Local + Vercel + Render)
 *  --------------------------- */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",

  // ✅ Your Vercel domains (add your exact current one)
  "https://budget-overview-w1zr.vercel.app",
  "https://budget-overview-w1zr-i70d.vercel.app",
  "https://budget-overview-w1zr-k2ed9upuyq-satish-reddys-projects-adbbc408.vercel.app",

  // If you use a custom domain later, add it here:
  // "https://yourdomain.com",
];

app.use(
  cors({
    origin: function (origin, cb) {
      // allow requests with no origin (Postman, curl)
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);

      // allow any vercel preview deployments
      if (origin.endsWith(".vercel.app")) return cb(null, true);

      return cb(new Error("Not allowed by CORS: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/** ---------------------------
 *  Simple test routes
 *  --------------------------- */
app.get("/", (req, res) => {
  res.send("BudgetBot Backend is running ✅");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend is healthy ✅" });
});

/** ---------------------------
 *  API Routes
 *  --------------------------- */
app.use("/api/auth", authRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/transactions", transactionRoutes);

/** ---------------------------
 *  Error handler (so you see real errors)
 *  --------------------------- */
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ message: err.message || "Server error" });
});

/** ---------------------------
 *  DB + Start
 *  --------------------------- */
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });