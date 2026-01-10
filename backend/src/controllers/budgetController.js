import Budget from "../models/Budget.js";

// GET /api/budgets?month=&year=
export const getBudgets = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    const query = { user: req.user._id };
    if (month) query.month = month;
    if (year) query.year = year;

    const budgets = await Budget.find(query).sort({ category: 1 });
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/budgets  { category, limit, month, year }
export const upsertBudget = async (req, res) => {
  try {
    const { category, limit, month, year } = req.body;

    if (!category || !category.trim()) {
      return res.status(400).json({ message: "Category is required" });
    }

    const lim = Number(limit);
    if (!Number.isFinite(lim) || lim < 0) {
      return res.status(400).json({ message: "Limit must be a valid number" });
    }

    const m = Number(month);
    const y = Number(year);
    if (!m || !y) {
      return res.status(400).json({ message: "Month and Year are required" });
    }

    const saved = await Budget.findOneAndUpdate(
      { user: req.user._id, month: m, year: y, category: category.trim() },
      { $set: { limit: lim } },
      { new: true, upsert: true }
    );

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/budgets/:id
export const deleteBudget = async (req, res) => {
  try {
    const doc = await Budget.findOne({ _id: req.params.id, user: req.user._id });
    if (!doc) return res.status(404).json({ message: "Not found" });

    await doc.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};