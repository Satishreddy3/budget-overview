import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axiosInstance from "../api/axios";

function ProgressBar({ pct }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color =
    clamped >= 100
      ? "rgba(255,107,107,0.9)" // exceeded
      : clamped >= 80
      ? "rgba(255,199,89,0.95)" // warning
      : "rgba(81,207,102,0.9)"; // safe

  return (
    <div
      style={{
        height: 10,
        width: "100%",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${clamped}%`,
          background: color,
        }}
      />
    </div>
  );
}

export default function Budgets() {
  const { transactions, month, year } = useOutletContext();

  const [budgets, setBudgets] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchBudgets = async () => {
    try {
      setError("");
      setLoading(true);

      const res = await axiosInstance.get("/budgets", {
        params: { month: month + 1, year }, // backend expects 1..12
      });

      setBudgets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  // Calculate spent per category from transactions (expense only)
  const spentByCategory = useMemo(() => {
    const map = new Map();
    for (const t of transactions || []) {
      if (t.type !== "expense") continue;
      const cat = (t.category || "Other").trim();
      const amt = Number(t.amount || 0);
      map.set(cat, (map.get(cat) || 0) + amt);
    }
    return map;
  }, [transactions]);

  const monthLabel = useMemo(() => {
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${names[month]} ${year}`;
  }, [month, year]);

  const rows = useMemo(() => {
    return (budgets || []).map((b) => {
      const category = (b.category || "Other").trim();
      const limit = Number(b.limit || b.amount || 0); // supports your schema
      const spent = Number(spentByCategory.get(category) || 0);
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      const remaining = limit - spent;

      const status =
        limit <= 0
          ? "No limit"
          : spent >= limit
          ? "Exceeded"
          : pct >= 80
          ? "Warning"
          : "Safe";

      return { ...b, category, limit, spent, pct, remaining, status };
    });
  }, [budgets, spentByCategory]);

  const summary = useMemo(() => {
    let totalLimit = 0;
    let totalSpent = 0;

    for (const r of rows) {
      totalLimit += Number(r.limit || 0);
      totalSpent += Number(r.spent || 0);
    }
    return { totalLimit, totalSpent, remaining: totalLimit - totalSpent };
  }, [rows]);

  const deleteBudget = async (id) => {
    const ok = window.confirm("Delete this budget?");
    if (!ok) return;

    try {
      await axiosInstance.delete(`/budgets/${id}`);
      fetchBudgets();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete budget");
    }
  };

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 className="h2" style={{ marginBottom: 4 }}>Budgets</h2>
          <div className="muted">Month: <b>{monthLabel}</b></div>
        </div>

        <div className="kpi" style={{ minWidth: 280 }}>
          <div className="label">Monthly Budget Summary</div>
          <div className="value" style={{ fontSize: 16 }}>
            Spent ₹{summary.totalSpent} / ₹{summary.totalLimit}
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Remaining: ₹{summary.remaining}
          </div>
        </div>
      </div>

      {loading && <p className="muted">Loading budgets...</p>}
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}

      {rows.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          No budgets set for this month.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Spent</th>
              <th>Limit</th>
              <th>Progress</th>
              <th>Status</th>
              <th style={{ width: 120 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.category}</td>
                <td>₹{r.spent}</td>
                <td>₹{r.limit}</td>
                <td>
                  <div style={{ display: "grid", gap: 6 }}>
                    <ProgressBar pct={r.pct} />
                    <div className="muted" style={{ fontSize: 12 }}>
                      {r.limit > 0 ? `${Math.round(r.pct)}%` : "—"}
                      {" · "}
                      Remaining: ₹{r.remaining}
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background:
                        r.status === "Exceeded"
                          ? "rgba(255,107,107,0.12)"
                          : r.status === "Warning"
                          ? "rgba(255,199,89,0.12)"
                          : "rgba(81,207,102,0.12)",
                      borderColor:
                        r.status === "Exceeded"
                          ? "rgba(255,107,107,0.35)"
                          : r.status === "Warning"
                          ? "rgba(255,199,89,0.35)"
                          : "rgba(81,207,102,0.35)",
                    }}
                  >
                    {r.status}
                  </span>
                </td>
                <td>
                  <button className="btn" onClick={() => deleteBudget(r._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="muted" style={{ marginTop: 14 }}>
        Tip: Budgets compare against <b>Expenses</b> only (income is ignored).
      </p>
    </div>
  );
}