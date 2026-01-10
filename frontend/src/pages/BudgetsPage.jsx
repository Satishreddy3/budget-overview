import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../api/axios";

/* ✅ USD formatter */
const formatUSD = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

export default function BudgetsPage() {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [limit, setLimit] = useState("");

  // Current month/year
  const now = useMemo(() => new Date(), []);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const startOfMonth = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const endOfMonth = useMemo(
    () => new Date(year, month, 0, 23, 59, 59, 999),
    [year, month]
  );

  /* ---------------- API ---------------- */

  const fetchTransactions = async () => {
    const res = await axiosInstance.get("/transactions", {
      params: {
        type: "expense",
        from: startOfMonth.toISOString(),
        to: endOfMonth.toISOString(),
      },
    });
    setTransactions(res.data || []);
  };

  const fetchBudgets = async () => {
    const res = await axiosInstance.get("/budgets", {
      params: { month, year },
    });
    setBudgets(res.data || []);
  };

  const refreshAll = async () => {
    setError("");
    setLoading(true);
    try {
      await Promise.all([fetchTransactions(), fetchBudgets()]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load budgets data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Computed ---------------- */

  const allCategories = useMemo(() => {
    const set = new Set();
    transactions.forEach((t) => t?.category && set.add(t.category.trim()));
    budgets.forEach((b) => b?.category && set.add(b.category.trim()));
    return Array.from(set).sort();
  }, [transactions, budgets]);

  const spentByCategory = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      const cat = t.category?.trim();
      if (!cat) continue;
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    }
    return map;
  }, [transactions]);

  const limitByCategory = useMemo(() => {
    const map = {};
    for (const b of budgets) {
      const cat = b.category?.trim();
      if (!cat) continue;
      map[cat] = { _id: b._id, limit: Number(b.limit || 0) };
    }
    return map;
  }, [budgets]);

  const rows = useMemo(() => {
    return allCategories.map((cat) => {
      const spent = spentByCategory[cat] || 0;
      const entry = limitByCategory[cat];
      const lim = entry?.limit || 0;

      let status = "no_limit";
      let percent = 0;

      if (lim > 0) {
        percent = (spent / lim) * 100;
        if (percent > 100) status = "over";
        else if (percent >= 80) status = "near";
        else status = "ok";
      }

      return {
        category: cat,
        spent,
        limit: lim,
        budgetId: entry?._id,
        percent,
        status,
      };
    });
  }, [allCategories, spentByCategory, limitByCategory]);

  const chosenCategory = newCategory.trim() || selectedCategory.trim();

  /* ---------------- Actions ---------------- */

  const handleSaveLimit = async (e) => {
    e.preventDefault();
    setError("");

    const lim = Number(limit);
    if (!chosenCategory) return setError("Please select or type a category");
    if (!lim || lim <= 0) return setError("Enter a valid limit");

    try {
      await axiosInstance.post("/budgets", {
        category: chosenCategory,
        limit: lim,
        month,
        year,
      });
      setLimit("");
      setSelectedCategory("");
      setNewCategory("");
      await fetchBudgets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save limit");
    }
  };

  const handleDeleteLimit = async (budgetId) => {
    try {
      await axiosInstance.delete(`/budgets/${budgetId}`);
      await fetchBudgets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete limit");
    }
  };

  /* ---------------- UI ---------------- */

  const statusColor = (s) =>
    s === "over" ? "tomato" : s === "near" ? "orange" : s === "ok" ? "lightgreen" : "#aaa";

  const statusLabel = (s) =>
    s === "over"
      ? "❌ Over budget"
      : s === "near"
      ? "⚠️ Near limit"
      : s === "ok"
      ? "✅ Within limit"
      : "ℹ️ No limit set";

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Set Budget Limit</h2>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "tomato" }}>{error}</p>}

      <form onSubmit={handleSaveLimit} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="">Select category</option>
          {allCategories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <input
          placeholder="Or type new category (e.g., Travel)"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />

        <input
          placeholder="Enter limit (USD)"
          type="number"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />

        <button type="submit">Save Limit</button>
      </form>

      <hr style={{ margin: "18px 0" }} />

      <h2>Category Limits</h2>

      {rows.map((r) => (
        <div key={r.category} style={{ border: "1px solid #333", borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>{r.category}</b>
            {r.limit > 0 ? (
              <button onClick={() => handleDeleteLimit(r.budgetId)}>Delete</button>
            ) : (
              <button onClick={() => setSelectedCategory(r.category)}>Set</button>
            )}
          </div>

          <div style={{ color: "#bbb", marginTop: 6 }}>
            Limit: {r.limit > 0 ? formatUSD(r.limit) : "Not set"} ·
            Spent: {formatUSD(r.spent)}
          </div>
        </div>
      ))}

      <hr style={{ margin: "18px 0" }} />

      <h2>Budget Warnings</h2>

      {rows.filter((r) => r.limit > 0).map((r) => (
        <div key={r.category} style={{ border: "1px solid #333", borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ fontWeight: 800, color: statusColor(r.status) }}>
            {statusLabel(r.status)} — {r.category}
          </div>
          <div style={{ color: "#bbb", marginTop: 6 }}>
            Spent {formatUSD(r.spent)} / Limit {formatUSD(r.limit)} ({Math.round(r.percent)}%)
          </div>
        </div>
      ))}
    </div>
  );
}