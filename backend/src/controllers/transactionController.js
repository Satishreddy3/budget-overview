import Transaction from "../models/Transaction.js";

/**
 * GET /api/transactions?from=...&to=...&type=income|expense
 * - if from/to not provided, returns all user's transactions
 */
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "No token provided" });

    const { from, to, type } = req.query;

    const filter = { user: userId };

    // Optional date filter
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    // Optional type filter
    if (type && ["income", "expense"].includes(String(type).toLowerCase())) {
      filter.type = String(type).toLowerCase();
    }

    const txs = await Transaction.find(filter).sort({ date: -1 });

    return res.json(txs);
  } catch (err) {
    console.error("getTransactions error:", err);
    return res.status(500).json({ message: "Failed to load transactions" });
  }
};

/**
 * POST /api/transactions
 * body: { type, category, amount, date? }
 */
export const addTransaction = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "No token provided" });

    const { type, category, amount, date } = req.body;

    const t = String(type || "").toLowerCase().trim();
    if (!["income", "expense"].includes(t)) {
      return res.status(400).json({ message: "type must be income or expense" });
    }

    const c = String(category || "").trim();
    if (!c) return res.status(400).json({ message: "category is required" });

    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const txDate = date ? new Date(date) : new Date();
    if (Number.isNaN(txDate.getTime())) {
      return res.status(400).json({ message: "invalid date" });
    }

    const created = await Transaction.create({
      user: userId,
      type: t,
      category: c,
      amount: a,
      date: txDate,
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("addTransaction error:", err);
    return res.status(500).json({ message: "Failed to add transaction" });
  }
};

/**
 * PUT /api/transactions/:id
 * body: { type?, category?, amount?, date? }
 */
export const updateTransaction = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "No token provided" });

    const { id } = req.params;

    const tx = await Transaction.findOne({ _id: id, user: userId });
    if (!tx) return res.status(404).json({ message: "Transaction not found" });

    const { type, category, amount, date } = req.body;

    if (type !== undefined) {
      const t = String(type).toLowerCase().trim();
      if (!["income", "expense"].includes(t)) {
        return res.status(400).json({ message: "type must be income or expense" });
      }
      tx.type = t;
    }

    if (category !== undefined) {
      const c = String(category).trim();
      if (!c) return res.status(400).json({ message: "category is required" });
      tx.category = c;
    }

    if (amount !== undefined) {
      const a = Number(amount);
      if (!Number.isFinite(a) || a <= 0) {
        return res.status(400).json({ message: "amount must be a positive number" });
      }
      tx.amount = a;
    }

    if (date !== undefined) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ message: "invalid date" });
      tx.date = d;
    }

    const saved = await tx.save();
    return res.json(saved);
  } catch (err) {
    console.error("updateTransaction error:", err);
    return res.status(500).json({ message: "Failed to update transaction" });
  }
};

/**
 * DELETE /api/transactions/:id
 */
export const deleteTransaction = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "No token provided" });

    const { id } = req.params;

    const deleted = await Transaction.findOneAndDelete({ _id: id, user: userId });
    if (!deleted) return res.status(404).json({ message: "Transaction not found" });

    return res.json({ message: "Transaction deleted" });
  } catch (err) {
    console.error("deleteTransaction error:", err);
    return res.status(500).json({ message: "Failed to delete transaction" });
  }
};