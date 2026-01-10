import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getBudgets,
  upsertBudget,
  deleteBudget,
} from "../controllers/budgetController.js";

const router = express.Router();

// Protect all budget routes
router.use(authMiddleware);

router.get("/", getBudgets);
router.post("/", upsertBudget);
router.delete("/:id", deleteBudget);

export default router;