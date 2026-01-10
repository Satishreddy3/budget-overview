import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axios";

function getMonthRangeISO(year, monthIndex0) {
  // monthIndex0: 0 = Jan ... 11 = Dec
  const from = new Date(year, monthIndex0, 1, 0, 0, 0, 0);
  const to = new Date(year, monthIndex0 + 1, 1, 0, 0, 0, 0); // next month start
  return { fromISO: from.toISOString(), toISO: to.toISOString() };
}

export default function DashboardLayout() {
  const navigate = useNavigate();

  // ✅ Month filter state (default = current month)
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0..11

  const [transactions, setTransactions] = useState([]);
  const [txError, setTxError] = useState("");

  const { fromISO, toISO } = useMemo(() => getMonthRangeISO(year, month), [year, month]);

  const fetchTransactions = async (extraParams = {}) => {
    try {
      setTxError("");

      // ✅ Always apply month filter by default
      const params = {
        from: fromISO,
        to: toISO,
        ...extraParams,
      };

      const res = await axiosInstance.get("/transactions", { params });
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to load transactions";
      setTxError(msg);

      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    }
  };

  // ✅ Refetch whenever month/year changes
  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromISO, toISO]);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const Tab = ({ to, children }) => (
    <NavLink to={to} className={({ isActive }) => `tab ${isActive ? "active" : ""}`}>
      {children}
    </NavLink>
  );

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1 className="title">Budget Overview</h1>
          <div className="sub">
            Welcome <b>{user?.name || "User"}</b> ✅
          </div>
        </div>

        <div className="row">
          {/* ✅ Month + Year filter */}
          <select className="select" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {monthNames.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>

          <select className="select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: 6 }).map((_, i) => {
              const y = now.getFullYear() - 3 + i; // range around current year
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>

          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="tabs">
        <Tab to="/dashboard/summary">Summary</Tab>
        <Tab to="/dashboard/budgets">Budgets</Tab>
        <Tab to="/dashboard/charts">Charts</Tab>
        <Tab to="/dashboard/transactions">Transactions</Tab>
      </div>

      {txError && (
        <div className="card">
          <p style={{ color: "var(--danger)", margin: 0 }}>{txError}</p>
        </div>
      )}

      {/* ✅ Provide month/year + filtered transactions to all pages */}
      <Outlet
        context={{
          transactions,
          fetchTransactions,
          txError,
          year,
          month,       // 0..11
          fromISO,
          toISO,
        }}
      />
    </div>
  );
}