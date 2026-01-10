import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function formatINR(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString("en-IN")}`;
}

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // yyyy-mm
}

function monthLabelFromKey(key) {
  const [y, m] = key.split("-").map(Number);
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${names[m - 1]} ${y}`;
}

// returns last 6 months keys including current month of "now"
function getLast6MonthKeys(now = new Date()) {
  const keys = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

function Last6MonthsTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const income = payload.find((p) => p.dataKey === "income")?.value || 0;
  const expense = payload.find((p) => p.dataKey === "expense")?.value || 0;
  const net = income - expense;

  return (
    <div
      style={{
        background: "rgba(20,20,20,0.9)",
        border: "1px solid rgba(255,255,255,0.15)",
        padding: 10,
        borderRadius: 12,
        color: "white",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
      <div>Income: <b style={{ color: "#51cf66" }}>{formatINR(income)}</b></div>
      <div>Expense: <b style={{ color: "#ff6b6b" }}>{formatINR(expense)}</b></div>
      <div style={{ marginTop: 6 }}>
        Net:{" "}
        <b style={{ color: net >= 0 ? "#51cf66" : "#ff6b6b" }}>
          {formatINR(net)}
        </b>
      </div>
    </div>
  );
}

/**
 * Use this component inside your Charts page.
 * Pass transactions array (same one used in pie chart).
 */
export function Last6MonthsBar({ transactions = [] }) {
  const data = useMemo(() => {
    const keys = getLast6MonthKeys(new Date());
    const base = new Map(keys.map((k) => [k, { key: k, month: monthLabelFromKey(k), income: 0, expense: 0 }]));

    for (const t of transactions || []) {
      const k = monthKey(t.date || t.createdAt || Date.now());
      if (!base.has(k)) continue;

      const amt = Number(t.amount || 0);
      const type = String(t.type || "").toLowerCase();

      if (type === "income") base.get(k).income += amt;
      if (type === "expense") base.get(k).expense += amt;
    }

    return Array.from(base.values());
  }, [transactions]);

  return (
    <div style={{ marginTop: 18 }}>
      <h3 style={{ margin: "0 0 10px 0" }}>Last 6 Months</h3>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={26}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.7)" }} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.7)" }} />
            <Tooltip content={<Last6MonthsTooltip />} />
            <Legend />
            {/* NOTE: no explicit colors if you want defaults */}
            <Bar dataKey="income" />
            <Bar dataKey="expense" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8 }}>
        Tip: Add transactions with older dates (last 6 months) to populate more bars.
      </div>
    </div>
  );
}