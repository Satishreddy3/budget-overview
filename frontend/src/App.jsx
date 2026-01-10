import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import DashboardLayout from "./pages/DashboardLayout";
import SummaryPage from "./pages/SummaryPage";
import BudgetsPage from "./pages/BudgetsPage";
import ChartsPage from "./pages/ChartsPage";
import TransactionsPage from "./pages/TransactionsPage";

export default function App() {
  return (
    <Routes>
      {/* redirect home */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* dashboard with nested pages */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="summary" replace />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="budgets" element={<BudgetsPage />} />
        <Route path="charts" element={<ChartsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}