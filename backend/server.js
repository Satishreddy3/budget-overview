import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

// Routes
import authRoutes from "./src/routes/authRoutes.js";
import budgetRoutes from "./src/routes/budgetRoutes.js";
import transactionRoutes from "./src/routes/transactionRoutes.js";

dotenv.config();

const app = express();

/* =========================
   CORS CONFIG (IMPORTANT)
   ========================= */
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",

  // ✅ Allow ALL Vercel previews
  /\.vercel\.app$/,

  // ✅ Allow Netlify
  /\.netlify\.app$/,

  // ✅ Allow Render frontend
  /\.onrender\.com$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const allowed = allowedOrigins.some((o) =>
        o instanceof RegExp ? o.test(origin) : o === origin
      );

      if (allowed) return callback(null, true);

      callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* =========================
   HEALTH + ROOT ROUTES
   ========================= */
app.get("/", (req, res) => {
  res.send("✅ BudgetBot Backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend healthy ✅" });
});

/* =========================
   API ROUTES
   ========================= */
app.use("/api/auth", authRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/transactions", transactionRoutes);

/* =========================
   GLOBAL ERROR HANDLER
   ========================= */
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err.message);
  res.status(500).json({
    message: err.message || "Internal server error",
  });
});

/* =========================
   DATABASE + SERVER START
   ========================= */
const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });