import toast from "react-hot-toast";
import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axiosInstance from "../api/axios";

function toDateInputValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function TransactionsPage() {
  const { transactions = [], fetchTransactions, month, year } = useOutletContext() || {};

  // Add form
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toDateInputValue(new Date()));

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");

  // UX
  const [loading, setLoading] = useState(false);

  // Edit modal
  const [editing, setEditing] = useState(null);
  const [editType, setEditType] = useState("expense");
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState(toDateInputValue(new Date()));

  useEffect(() => {
    fetchTransactions?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthLabel = useMemo(() => {
    const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${names[month] ?? ""} ${year ?? ""}`.trim();
  }, [month, year]);

  const filteredTransactions = useMemo(() => {
    let list = Array.isArray(transactions) ? transactions : [];

    if (filterType !== "all") list = list.filter((t) => t.type === filterType);

    const q = search.trim().toLowerCase();
    if (q) list = list.filter((t) => (t.category || "").toLowerCase().includes(q));

    return [...list].sort((a, b) => {
      const da = new Date(openDate(a)).getTime();
      const db = new Date(openDate(b)).getTime();
      return db - da;
    });
  }, [transactions, filterType, search]);

  function openDate(t) {
    return t?.date || t?.createdAt || Date.now();
  }

  const addTransaction = async () => {
    const amt = Number(amount);

    if (!category.trim() || !Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter valid category and amount");
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post("/transactions", {
        type,
        category: category.trim(),
        amount: amt,
        date: new Date(date).toISOString(),
      });

      setCategory("");
      setAmount("");
      setDate(toDateInputValue(new Date()));

      toast.success("Transaction added");
      await fetchTransactions?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (t) => {
    setEditing(t);
    setEditType(t.type || "expense");
    setEditCategory(t.category || "");
    setEditAmount(String(t.amount ?? ""));
    setEditDate(toDateInputValue(new Date(openDate(t))));
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing?._id) return;

    const amt = Number(editAmount);
    if (!editCategory.trim() || !Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter valid category and amount");
      return;
    }

    try {
      setLoading(true);

      await axiosInstance.put(`/transactions/${editing._id}`, {
        type: editType,
        category: editCategory.trim(),
        amount: amt,
        date: new Date(editDate).toISOString(),
      });

      toast.success("Transaction updated");
      closeEdit();
      await fetchTransactions?.();
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
      await fetchTransactions?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <h2 className="h2" style={{ marginBottom: 6 }}>Transactions</h2>
          <div className="muted">Viewing: <b>{monthLabel}</b></div>
        </div>
      </div>

      {/* Add form */}
      <div className="row" style={{ marginTop: 12, gap: 10, flexWrap: "wrap" }}>
        <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>

        <input
          className="input"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <input
          className="input"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <button className="btn" onClick={addTransaction} disabled={loading}>
          {loading ? "Working…" : "Add"}
        </button>
      </div>

      {/* Filters */}
      <div className="row" style={{ marginTop: 14, gap: 10, flexWrap: "wrap" }}>
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <input
          className="input"
          placeholder="Search category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="muted">Showing <b>{filteredTransactions.length}</b> transactions</div>
      </div>

      {/* Table */}
      {filteredTransactions.length ? (
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th style={{ width: 170 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((t) => (
              <tr key={t._id}>
                <td><span className={`badge ${t.type}`}>{t.type}</span></td>
                <td>{t.category}</td>
                <td>₹{Number(t.amount || 0).toLocaleString("en-IN")}</td>
                <td>{new Date(openDate(t)).toLocaleDateString()}</td>
                <td>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" onClick={() => openEdit(t)}>Edit</button>
                    <button className="btn" onClick={() => deleteTx(t._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted" style={{ marginTop: 14 }}>No transactions for this month.</p>
      )}

      {/* Edit modal */}
      {editing && (
        <div
          onClick={closeEdit}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.55)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 999999,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(640px, 95vw)",
              padding: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h2 className="h2" style={{ margin: 0 }}>Edit Transaction</h2>
              <button className="btn" onClick={closeEdit}>✕</button>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <select className="select" value={editType} onChange={(e) => setEditType(e.target.value)}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>

              <input
                className="input"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="Category"
              />

              <input
                className="input"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="Amount"
              />

              <input
                className="input"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <button className="btn" onClick={closeEdit}>Cancel</button>
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