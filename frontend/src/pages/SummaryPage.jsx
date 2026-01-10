import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";

function formatINR(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString("en-IN")}`;
}

function toDateLabel(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("en-GB");
}

function Card({ title, value, sub, tone = "neutral" }) {
  const toneStyle =
    tone === "good"
      ? { color: "rgba(81,207,102,0.95)" }
      : tone === "bad"
      ? { color: "rgba(255,107,107,0.95)" }
      : tone === "warn"
      ? { color: "rgba(255,199,89,0.95)" }
      : {};

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        minWidth: 180,
        flex: "1 1 220px", // ✅ responsive
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800, ...toneStyle }}>{value}</div>
      {sub && <div style={{ fontSize: 12, opacity: 0.7 }}>{sub}</div>}
    </div>
  );
}

function Pill({ text, tone = "neutral" }) {
  const bg =
    tone === "good"
      ? "rgba(81,207,102,0.14)"
      : tone === "bad"
      ? "rgba(255,107,107,0.14)"
      : tone === "warn"
      ? "rgba(255,199,89,0.14)"
      : "rgba(255,255,255,0.10)";

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        background: bg,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {text}
    </span>
  );
}

export default function SummaryPage() {
  const { transactions = [], budgets = [], monthLabel = "" } =
    useOutletContext() || {};

  const computed = useMemo(() => {
    let income = 0;
    let expense = 0;
    const expenseByCategory = new Map();
    let biggestExpense = null;

    for (const t of transactions) {
      const amt = Number(t.amount || 0);
      if (t.type === "income") income += amt;
      if (t.type === "expense") {
        expense += amt;
        expenseByCategory.set(
          t.category,
          (expenseByCategory.get(t.category) || 0) + amt
        );
        if (!biggestExpense || amt > biggestExpense.amount) {
          biggestExpense = {
            category: t.category,
            amount: amt,
            date: t.date || t.createdAt,
          };
        }
      }
    }

    let topCategory = null;
    for (const [cat, amt] of expenseByCategory.entries()) {
      if (!topCategory || amt > topCategory.amount)
        topCategory = { category: cat, amount: amt };
    }

    let safe = 0,
      warn = 0,
      exceeded = 0;
    const warnings = [];

    for (const b of budgets) {
      const limit = Number(b.limit ?? b.amount ?? 0);
      const spent = Number(expenseByCategory.get(b.category) || 0);
      if (limit <= 0) continue;
      const pct = (spent / limit) * 100;
      if (pct >= 100) {
        exceeded++;
        warnings.push({ cat: b.category, pct, spent, limit, tone: "bad" });
      } else if (pct >= 80) {
        warn++;
        warnings.push({ cat: b.category, pct, spent, limit, tone: "warn" });
      } else safe++;
    }

    return {
      income,
      expense,
      balance: income - expense,
      topCategory,
      biggestExpense,
      savingsRate: income ? ((income - expense) / income) * 100 : 0,
      safe,
      warn,
      exceeded,
      warnings,
    };
  }, [transactions, budgets]);

  /* ✅ EMPTY STATE */
  if (transactions.length === 0) {
    return (
      <div style={{ padding: 24, opacity: 0.75 }}>
        <h2>Summary</h2>
        <p>No transactions yet.</p>
        <p>Add your first transaction to see insights.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18, padding: 12 }}>
      <h2>
        Summary{" "}
        {monthLabel && <span style={{ opacity: 0.7 }}>({monthLabel})</span>}
      </h2>

      {/* ✅ Responsive cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <Card title="Income" value={formatINR(computed.income)} tone="good" />
        <Card title="Expense" value={formatINR(computed.expense)} tone="bad" />
        <Card
          title="Balance"
          value={formatINR(computed.balance)}
          tone={computed.balance >= 0 ? "good" : "bad"}
        />
      </div>

      {/* Insights */}
      <div
        style={{
          padding: 16,
          borderRadius: 18,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <h3>Insights</h3>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill text={`Safe: ${computed.safe}`} tone="good" />
          <Pill text={`Warning: ${computed.warn}`} tone="warn" />
          <Pill text={`Exceeded: ${computed.exceeded}`} tone="bad" />
        </div>

        <div style={{ marginTop: 12 }}>
          <b>Top category:</b>{" "}
          {computed.topCategory
            ? `${computed.topCategory.category} — ${formatINR(
                computed.topCategory.amount
              )}`
            : "—"}
        </div>

        <div>
          <b>Biggest expense:</b>{" "}
          {computed.biggestExpense
            ? `${computed.biggestExpense.category} — ${formatINR(
                computed.biggestExpense.amount
              )} (${toDateLabel(computed.biggestExpense.date)})`
            : "—"}
        </div>

        <div>
          <b>Savings rate:</b>{" "}
          {computed.income ? `${Math.round(computed.savingsRate)}%` : "—"}
        </div>
      </div>
    </div>
  );
}