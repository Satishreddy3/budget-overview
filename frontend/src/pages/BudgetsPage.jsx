import { useEffect, useMemo, useState } from "react";
import axiosInstance from "../api/axios";

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
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();

  // Helpers
  const startOfMonth = useMemo(() => new Date(year, month - 1, 1), [year, month]);
  const endOfMonth = useMemo(() => new Date(year, month, 0, 23, 59, 59, 999), [year, month]);

  const money = (n) => `₹${Number(n || 0)}`;

  // ✅ Fetch transactions (current month expenses)
  const fetchTransactions = async () => {
    const params = {
      type: "expense",
      from: startOfMonth.toISOString(),
      to: endOfMonth.toISOString(),
    };
    const res = await axiosInstance.get("/transactions", { params });
    setTransactions(res.data || []);
  };

  // ✅ Fetch budgets (current month)
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

  // ✅ Categories from transactions + budgets
  const allCategories = useMemo(() => {
    const set = new Set();

    // from txns
    for (const t of transactions) {
      if (t?.category) set.add(String(t.category).trim());
    }

    // from budgets
    for (const b of budgets) {
      if (b?.category) set.add(String(b.category).trim());
    }

    return Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [transactions, budgets]);

  // ✅ Spent per category (this month)
  const spentByCategory = useMemo(() => {
    const map = {};
    for (const t of transactions) {
      const cat = String(t.category || "").trim();
      if (!cat) continue;
      map[cat] = (map[cat] || 0) + Number(t.amount || 0);
    }
    return map;
  }, [transactions]);

  // ✅ Limit per category (this month)
  const limitByCategory = useMemo(() => {
    const map = {};
    for (const b of budgets) {
      const cat = String(b.category || "").trim();
      if (!cat) continue;
      map[cat] = {
        _id: b._id,
        limit: Number(b.limit || 0),
      };
    }
    return map;
  }, [budgets]);

  // ✅ Combined rows for "All categories"
  const rows = useMemo(() => {
    return allCategories.map((cat) => {
      const spent = Number(spentByCategory[cat] || 0);
      const entry = limitByCategory[cat];
      const lim = entry ? Number(entry.limit || 0) : 0;

      // status
      let status = "no_limit"; // no limit set
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
        budgetId: entry?._id || null,
        percent,
        status,
      };
    });
  }, [allCategories, spentByCategory, limitByCategory]);

  // ✅ Dropdown options
  const categoryOptions = useMemo(() => {
    return ["", ...allCategories];
  }, [allCategories]);

  const chosenCategory = useMemo(() => {
    const typed = newCategory.trim();
    if (typed) return typed;
    return selectedCategory.trim();
  }, [newCategory, selectedCategory]);

  // ✅ Save limit (upsert)
  const handleSaveLimit = async (e) => {
    e.preventDefault();
    setError("");

    const cat = chosenCategory;
    const lim = Number(limit);

    if (!cat) return setError("Please select or type a category");
    if (!lim || lim <= 0) return setError("Please enter a valid limit (> 0)");

    try {
      await axiosInstance.post("/budgets", {
        category: cat,
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

  // ✅ Delete limit
  const handleDeleteLimit = async (budgetId) => {
    setError("");
    try {
      await axiosInstance.delete(`/budgets/${budgetId}`);
      await fetchBudgets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete limit");
    }
  };

  // Quick set button
  const setFromRow = (cat) => {
    setSelectedCategory(cat);
    setNewCategory("");
  };

  const statusColor = (status) => {
    if (status === "over") return "tomato";
    if (status === "near") return "orange";
    if (status === "ok") return "lightgreen";
    return "#bbb";
  };

  const statusLabel = (status) => {
    if (status === "over") return "❌ Over budget";
    if (status === "near") return "⚠️ Near limit";
    if (status === "ok") return "✅ Within limit";
    return "ℹ️ No limit set";
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Set Budget Limit</h2>

      {loading ? <p>Loading...</p> : null}
      {error ? <p style={{ color: "tomato" }}>{error}</p> : null}

      <form
        onSubmit={handleSaveLimit}
        style={{ display: "grid", gap: 10, maxWidth: 520 }}
      >
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setNewCategory("");
          }}
        >
          <option value="">Select category</option>
          {categoryOptions
            .filter((c) => c !== "")
            .map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
        </select>

        <input
          placeholder="Or type new category (example: Travel)"
          value={newCategory}
          onChange={(e) => {
            setNewCategory(e.target.value);
            if (e.target.value.trim()) setSelectedCategory("");
          }}
        />

        <input
          placeholder="Enter limit (₹)"
          type="number"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />

        <button type="submit">Save Limit</button>
      </form>

      <hr style={{ margin: "18px 0" }} />

      <h2>Category Limits (All)</h2>

      {rows.length === 0 ? (
        <p>No categories yet. Add a transaction first.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
          {rows.map((r) => (
            <div
              key={r.category}
              style={{
                border: "1px solid #333",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 800 }}>{r.category}</div>

                {r.limit > 0 && r.budgetId ? (
                  <button type="button" onClick={() => handleDeleteLimit(r.budgetId)}>
                    Delete
                  </button>
                ) : (
                  <button type="button" onClick={() => setFromRow(r.category)}>
                    Set
                  </button>
                )}
              </div>

              <div style={{ marginTop: 8, color: "#bbb" }}>
                Limit: {r.limit > 0 ? money(r.limit) : "Not set"} · Spent (this month):{" "}
                {money(r.spent)}
              </div>
            </div>
          ))}
        </div>
      )}

      <hr style={{ margin: "18px 0" }} />

      <h2>Budget Warnings (This Month)</h2>

      {rows.filter((r) => r.limit > 0).length === 0 ? (
        <p>No limits set yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, maxWidth: 640 }}>
          {rows
            .filter((r) => r.limit > 0)
            .map((r) => (
              <div
                key={r.category}
                style={{
                  border: "1px solid #333",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div style={{ fontWeight: 800, color: statusColor(r.status) }}>
                  {statusLabel(r.status)} — {r.category}
                </div>

                <div style={{ marginTop: 6, color: "#bbb" }}>
                  Spent: {money(r.spent)} / Limit: {money(r.limit)}
                  {r.limit > 0 ? ` (${Math.round(r.percent)}%)` : ""}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}