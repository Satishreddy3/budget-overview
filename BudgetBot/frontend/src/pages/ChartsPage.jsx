import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axiosInstance from "../api/axios";

function toDateInputValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ✅ US-style categories (you can edit this list anytime)
const CATEGORY_OPTIONS = [
  "Groceries",
  "Dining",
  "Travel",
  "Rent",
  "Utilities",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Health",
  "Insurance",
  "Subscriptions",
  "Education",
  "Gifts",
  "Other",
];

export default function TransactionsPage() {
  const { transactions = [], fetchTransactions, month, year } = useOutletContext();

  // Add form
  const [type, setType] = useState("expense");
  const [merchant, setMerchant] = useState(""); // ✅ NEW
  const [category, setCategory] = useState("Other");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toDateInputValue(new Date()));

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Edit modal
  const [editing, setEditing] = useState(null);
  const [editType, setEditType] = useState("expense");
  const [editMerchant, setEditMerchant] = useState(""); // ✅ NEW
  const [editCategory, setEditCategory] = useState("Other");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState(toDateInputValue(new Date()));

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthLabel = useMemo(() => {
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${names[month]} ${year}`;
  }, [month, year]);

  const filteredTransactions = useMemo(() => {
    let list = Array.isArray(transactions) ? transactions : [];

    if (filterType !== "all") list = list.filter((t) => t.type === filterType);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const m = String(t.merchant || "").toLowerCase();
        const c = String(t.category || "").toLowerCase();
        return m.includes(q) || c.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      const da = new Date(a.date || a.createdAt || 0).getTime();
      const db = new Date(b.date || b.createdAt || 0).getTime();
      return db - da;
    });
  }, [transactions, filterType, search]);

  const addTransaction = async () => {
    const amt = Number(amount);

    if (!merchant.trim()) return toast.error("Enter Merchant / Item name");
    if (!category.trim()) return toast.error("Select a category");
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");

    try {
      setLoading(true);

      await axiosInstance.post("/transactions", {
        type,
        merchant: merchant.trim(),   // ✅ send merchant
        category: category.trim(),   // ✅ send category
        amount: amt,
        date: new Date(date).toISOString(),
      });

      setMerchant("");
      setCategory("Other");
      setAmount("");
      setDate(toDateInputValue(new Date()));

      toast.success("Transaction added");
      await fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (t) => {
    setEditing(t);
    setEditType(t.type || "expense");
    setEditMerchant(String(t.merchant || "")); // ✅ load merchant
    setEditCategory(String(t.category || "Other"));
    setEditAmount(String(t.amount ?? ""));
    setEditDate(toDateInputValue(new Date(t.date || t.createdAt || Date.now())));
  };

  const saveEdit = async () => {
    if (!editing) return;

    const amt = Number(editAmount);
    if (!editMerchant.trim()) return toast.error("Enter Merchant / Item name");
    if (!editCategory.trim()) return toast.error("Select a category");
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");

    try {
      setLoading(true);

      await axiosInstance.put(`/transactions/${editing._id}`, {
        type: editType,
        merchant: editMerchant.trim(), // ✅ update merchant
        category: editCategory.trim(),
        amount: amt,
        date: new Date(editDate).toISOString(),
      });

      toast.success("Transaction updated");
      setEditing(null);
      await fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update transaction");
    } finally {
      setLoading(false);
    }
  };

  const deleteTx = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;

    try {
      setLoading(true);
      await axiosInstance.delete(`/transactions/${id}`);
      toast.success("Transaction deleted");
      await fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="h2">Transactions</h2>
      <div className="muted">Viewing: <b>{monthLabel}</b></div>

      {/* Add form */}
      <div className="row" style={{ marginTop: 12 }}>
        <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <input
          className="input"
          placeholder="Merchant / Item (e.g., Walmart, UberEats)"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
        />

        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input className="input" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <button className="btn" onClick={addTransaction} disabled={loading}>
          {loading ? "Working…" : "Add"}
        </button>
      </div>

      {/* Filters */}
      <div className="row" style={{ marginTop: 14 }}>
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <input
          className="input"
          placeholder="Search merchant or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="muted">Showing <b>{filteredTransactions.length}</b> transactions</div>
      </div>

      {/* Table */}
      {filteredTransactions.length ? (
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((t) => (
              <tr key={t._id}>
                <td><span className={`badge ${t.type}`}>{t.type}</span></td>
                <td>{t.merchant?.trim() ? t.merchant : "-"}</td>
                <td>{t.category || "Other"}</td>
                <td>₹{t.amount}</td>
                <td>{new Date(t.date || t.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn" onClick={() => openEdit(t)}>Edit</button>
                    <button className="btn" onClick={() => deleteTx(t._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">No transactions for this month.</p>
      )}

      {/* Edit modal */}
      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", padding: 16 }}>
          <div className="card" style={{ width: 620, maxWidth: "95vw" }}>
            <h2 className="h2">Edit Transaction</h2>

            <div className="row" style={{ marginTop: 12 }}>
              <select className="select" value={editType} onChange={(e) => setEditType(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <input
                className="input"
                placeholder="Merchant / Item"
                value={editMerchant}
                onChange={(e) => setEditMerchant(e.target.value)}
              />

              <select className="select" value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <input className="input" placeholder="Amount" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              <input className="input" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>

            <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn" onClick={saveEdit} disabled={loading}>
                {loading ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}