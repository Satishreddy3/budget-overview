import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axios";
import suggestCategory from "../utils/suggestCategory";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

function getMonthYearToday() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function yyyyMmDd(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(year, month) {
  return new Date(year, month - 1, 1);
}
function endOfMonth(year, month) {
  return new Date(year, month, 0);
}

export default function Dashboard() {
  const navigate = useNavigate();

  // -----------------------
  // Auth / user
  // -----------------------
  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // -----------------------
  // Tabs
  // -----------------------
  const [tab, setTab] = useState("summary"); // summary | budgets | charts | transactions

  // -----------------------
  // Transactions state
  // -----------------------
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [transactions, setTransactions] = useState([]);

  // Filters
  const [filterType, setFilterType] = useState("all"); // all | income | expense
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [fromDate, setFromDate] = useState(yyyyMmDd(new Date()));
  const [toDate, setToDate] = useState(yyyyMmDd(new Date()));

  // Add transaction form
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!note) {
      setSuggestions([]);
      return;
    }
    const s = suggestCategory(note);
    setSuggestions(Array.isArray(s) ? s : []);
  }, [note]);

  const clearFilters = () => {
    setFilterType("all");
    setFilterCategory("");
    setFilterSearch("");
    const today = yyyyMmDd(new Date());
    setFromDate(today);
    setToDate(today);
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    setTxError("");
    try {
      const params = {};
      if (filterType !== "all") params.type = filterType;
      if (filterCategory.trim()) params.category = filterCategory.trim();
      if (filterSearch.trim()) params.q = filterSearch.trim();
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await axiosInstance.get("/transactions", { params });
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setTxError(e?.response?.data?.message || "Failed to load transactions");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterCategory, filterSearch, fromDate, toDate]);

  const addTransaction = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!amount || Number(amount) <= 0) {
      setFormError("Amount must be greater than 0.");
      return;
    }
    if (!category.trim()) {
      setFormError("Category is required.");
      return;
    }

    try {
      await axiosInstance.post("/transactions", {
        type,
        amount: Number(amount),
        category: category.trim(),
        note: note.trim(),
      });

      setAmount("");
      setCategory("");
      setNote("");
      setSuggestions([]);

      await fetchTransactions();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to add transaction");
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await axiosInstance.delete(`/transactions/${id}`);
      await fetchTransactions();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete");
    }
  };

  // -----------------------
  // Summary
  // -----------------------
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      const amt = Number(t.amount) || 0;
      if (t.type === "income") income += amt;
      else expense += amt;
    }
    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [transactions]);

  // -----------------------
  // Charts data
  // -----------------------
  const expensesByCategory = useMemo(() => {
    const map = new Map();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const key = (t.category || "Other").trim();
      map.set(key, (map.get(key) || 0) + (Number(t.amount) || 0));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const last6MonthsIncomeExpense = useMemo(() => {
    // Build last 6 months buckets (including current month)
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        label: d.toLocaleString(undefined, { month: "short" }),
        income: 0,
        expense: 0,
      });
    }

    const bucketMap = new Map(buckets.map((b) => [b.key, b]));

    for (const t of transactions) {
      const dt = new Date(t.date || t.createdAt || Date.now());
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const bucket = bucketMap.get(key);
      if (!bucket) continue;

      const amt = Number(t.amount) || 0;
      if (t.type === "income") bucket.income += amt;
      else bucket.expense += amt;
    }

    return buckets.map(({ label, income, expense }) => ({ label, income, expense }));
  }, [transactions]);

  // -----------------------
  // Budgets
  // -----------------------
  const { month: initMonth, year: initYear } = getMonthYearToday();
  const [budgetMonth, setBudgetMonth] = useState(initMonth);
  const [budgetYear, setBudgetYear] = useState(initYear);

  const [budgets, setBudgets] = useState([]);
  const [budLoading, setBudLoading] = useState(false);
  const [budError, setBudError] = useState("");

  const [budCategory, setBudCategory] = useState("");
  const [budLimit, setBudLimit] = useState("");

  const fetchBudgets = async () => {
    setBudLoading(true);
    setBudError("");
    try {
      const res = await axiosInstance.get("/budgets", {
        params: { month: budgetMonth, year: budgetYear },
      });
      setBudgets(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setBudError(e?.response?.data?.message || "Failed to load budgets");
    } finally {
      setBudLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetMonth, budgetYear]);

  const addBudget = async (e) => {
    e.preventDefault();
    setBudError("");

    if (!budCategory.trim()) {
      setBudError("Category is required.");
      return;
    }
    if (!budLimit || Number(budLimit) <= 0) {
      setBudError("Limit must be > 0.");
      return;
    }

    try {
      await axiosInstance.post("/budgets", {
        month: Number(budgetMonth),
        year: Number(budgetYear),
        category: budCategory.trim(),
        limit: Number(budLimit),
      });

      setBudCategory("");
      setBudLimit("");
      await fetchBudgets();
    } catch (e) {
      setBudError(e?.response?.data?.message || "Failed to save budget");
    }
  };

  const deleteBudget = async (id) => {
    try {
      await axiosInstance.delete(`/budgets/${id}`);
      await fetchBudgets();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete budget");
    }
  };

  // Budget usage computed from transactions (for selected month/year)
  const budgetUsage = useMemo(() => {
    const from = startOfMonth(budgetYear, budgetMonth);
    const to = endOfMonth(budgetYear, budgetMonth);

    const spentByCategory = new Map();
    for (const t of transactions) {
      if (t.type !== "expense") continue;
      const dt = new Date(t.date || t.createdAt || Date.now());
      if (dt < from || dt > to) continue;

      const key = (t.category || "Other").trim();
      spentByCategory.set(key, (spentByCategory.get(key) || 0) + (Number(t.amount) || 0));
    }

    return budgets.map((b) => {
      const spent = spentByCategory.get((b.category || "").trim()) || 0;
      const limit = Number(b.limit) || 0;
      const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status = "ok";
      if (limit > 0 && spent > limit) status = "over";
      else if (limit > 0 && spent >= 0.8 * limit) status = "warning";

      return { ...b, spent, percent, status };
    });
  }, [budgets, transactions, budgetMonth, budgetYear]);

  const alerts = useMemo(() => {
    const over = budgetUsage.filter((b) => b.status === "over");
    const warn = budgetUsage.filter((b) => b.status === "warning");
    return { over, warn };
  }, [budgetUsage]);

  // -----------------------
  // UI helpers
  // -----------------------
  const sectionLine = { borderTop: "1px solid #444", margin: "18px 0" };
  const card = {
    padding: 14,
    borderRadius: 12,
    border: "1px solid #444",
    background: "rgba(255,255,255,0.04)",
  };

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h1 style={{ fontSize: 54, margin: "10px 0 6px" }}>Budget Overview</h1>

      <div style={{ opacity: 0.9, marginBottom: 10 }}>
        Welcome {user?.name || "User"} ✅
      </div>

      <button onClick={logout} style={{ marginBottom: 12 }}>
        Logout
      </button>

      {/* Alerts */}
      {(alerts.over.length > 0 || alerts.warn.length > 0) && (
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Budget Alerts</div>

          {alerts.over.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: "#ff6b6b" }}>Over limit:</div>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {alerts.over.map((b) => (
                  <li key={b._id}>
                    {b.category}: ₹{b.spent} / ₹{b.limit} ({b.percent}%)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {alerts.warn.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, color: "#ffd166" }}>Near limit (80%+):</div>
              <ul style={{ margin: "6px 0 0 18px" }}>
                {alerts.warn.map((b) => (
                  <li key={b._id}>
                    {b.category}: ₹{b.spent} / ₹{b.limit} ({b.percent}%)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={sectionLine} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        <button onClick={() => setTab("summary")}>Summary</button>
        <button onClick={() => setTab("budgets")}>Budgets</button>
        <button onClick={() => setTab("charts")}>Charts</button>
        <button onClick={() => setTab("transactions")}>Transactions</button>
      </div>

      {/* SUMMARY TAB */}
      {tab === "summary" && (
        <>
          <h2>Summary</h2>
          <div style={card}>
            <div>Income: ₹{summary.income}</div>
            <div>Expense: ₹{summary.expense}</div>
            <div>
              Balance:{" "}
              <span style={{ color: summary.balance >= 0 ? "#7CFC90" : "#ff6b6b" }}>
                ₹{summary.balance}
              </span>
            </div>
          </div>
        </>
      )}

      {/* BUDGETS TAB */}
      {tab === "budgets" && (
        <>
          <h2>Budgets</h2>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="number"
              min="1"
              max="12"
              value={budgetMonth}
              onChange={(e) => setBudgetMonth(Number(e.target.value))}
              style={{ width: 80 }}
            />
            <input
              type="number"
              min="2000"
              max="2100"
              value={budgetYear}
              onChange={(e) => setBudgetYear(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <button onClick={fetchBudgets}>Refresh</button>
          </div>

          {budError && <div style={{ color: "#ff6b6b", marginTop: 10 }}>{budError}</div>}

          <div style={{ ...card, marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Set Budget Limit</div>
            <form
              onSubmit={addBudget}
              style={{ display: "grid", gap: 10, maxWidth: 520 }}
            >
              <input
                placeholder="Category (Rent, Food)"
                value={budCategory}
                onChange={(e) => setBudCategory(e.target.value)}
              />
              <input
                placeholder="Limit ₹"
                type="number"
                value={budLimit}
                onChange={(e) => setBudLimit(e.target.value)}
              />
              <button type="submit">Add</button>
            </form>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Your Budgets</div>

            {budLoading ? (
              <div>Loading...</div>
            ) : budgetUsage.length === 0 ? (
              <div style={{ opacity: 0.85 }}>No limits set yet.</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {budgetUsage.map((b) => {
                  const barColor =
                    b.status === "over" ? "#ff6b6b" : b.status === "warning" ? "#ffd166" : "#7CFC90";
                  const pct = Math.min(100, Math.max(0, b.percent || 0));

                  return (
                    <div key={b._id} style={{ ...card }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 700 }}>{b.category}</div>
                        <button type="button" onClick={() => deleteBudget(b._id)}>
                          Delete
                        </button>
                      </div>

                      <div style={{ marginTop: 8, opacity: 0.9 }}>
                        ₹{b.spent} / ₹{b.limit} ({b.percent}%)
                        {b.status === "warning" && (
                          <span style={{ marginLeft: 8, color: "#ffd166", fontWeight: 700 }}>
                            — WARNING
                          </span>
                        )}
                        {b.status === "over" && (
                          <span style={{ marginLeft: 8, color: "#ff6b6b", fontWeight: 700 }}>
                            — OVER
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          height: 10,
                          borderRadius: 999,
                          background: "#333",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: barColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* CHARTS TAB */}
      {tab === "charts" && (
        <>
          <h2>Charts</h2>

          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Expenses by Category</div>

            {expensesByCategory.length === 0 ? (
              <div style={{ opacity: 0.85 }}>No expense data yet.</div>
            ) : (
              <PieChart width={420} height={260}>
                <Pie
                  data={expensesByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label
                >
                  {expensesByCategory.map((_, i) => (
                    <Cell key={i} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            )}
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>
              Monthly Income vs Expense (Last 6 Months)
            </div>

            <BarChart width={520} height={280} data={last6MonthsIncomeExpense}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="expense" />
              <Bar dataKey="income" />
            </BarChart>
          </div>
        </>
      )}

      {/* TRANSACTIONS TAB */}
      {tab === "transactions" && (
        <>
          <h2>Filters</h2>

          <div style={{ ...card, display: "grid", gap: 10 }}>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>

            <input
              placeholder="Category (ex: Rent, Food)"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            />

            <input
              placeholder="Search note/category"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />

            <div style={{ display: "grid", gap: 6 }}>
              <label>From:</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <label>To:</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            <button type="button" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>

          <div style={sectionLine} />

          <h2>Add Transaction</h2>

          <div style={card}>
            <form onSubmit={addTransaction} style={{ display: "grid", gap: 10 }}>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <input
                placeholder="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <input
                placeholder="Category (Food, Rent...)"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />

              {/* Smart suggestions */}
              {suggestions.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {suggestions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: "#222",
                        cursor: "pointer",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              <input
                placeholder="Note (optional) — try: 'Swiggy dinner' or 'Rent for Dec'"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              {formError && <div style={{ color: "#ff6b6b" }}>{formError}</div>}

              <button type="submit">Add</button>
            </form>
          </div>

          <div style={sectionLine} />

          <h2>Transactions</h2>

          {txLoading ? (
            <div>Loading...</div>
          ) : txError ? (
            <div style={{ color: "#ff6b6b" }}>{txError}</div>
          ) : transactions.length === 0 ? (
            <div style={{ opacity: 0.85 }}>No transactions yet</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {transactions.map((t) => (
                <div key={t._id} style={{ ...card, display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {t.type} — ₹{t.amount} — {t.category}
                    </div>
                    <div style={{ opacity: 0.85, marginTop: 4 }}>
                      {t.note ? t.note : ""}
                      {t.date ? ` (${yyyyMmDd(t.date)})` : t.createdAt ? ` (${yyyyMmDd(t.createdAt)})` : ""}
                    </div>
                  </div>

                  <button type="button" onClick={() => deleteTransaction(t._id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}