# Budget Overview 💰

A full-stack personal finance dashboard that helps users track income and expenses, set category budgets, view insights, and analyze spending trends using charts.

This project was built to practice real-world full-stack development, including authentication, CRUD operations, business logic, and data visualization.

---

## 🚀 Features

### Authentication
- User signup & login
- JWT-based authentication
- Protected routes

### Transactions
- Add, edit, delete income & expense transactions
- Monthly filtering (month & year)
- Category search & type filters

### Budgets
- Set monthly budget limits per category
- View category-wise limits and spending
- Automatic budget warnings:
  - ✅ Within limit
  - ⚠️ Near limit
  - 🚨 Exceeded limit

### Insights
- Total income, expense & balance
- Top spending category
- Biggest expense
- Savings rate calculation

### Charts & Analytics
- Pie chart: expenses by category
- Bar chart: income vs expense (last 6 months)
- Visual trend analysis using Recharts

### UX & UI
- Clean dashboard layout
- Tabs navigation (Summary / Budgets / Charts / Transactions)
- Edit modal for transactions
- Toast notifications for actions

---

## 🛠 Tech Stack

### Frontend
- React (Vite)
- React Router
- Axios
- Recharts
- react-hot-toast

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication

---

## ⚙️ Installation & Setup

### Backend
```bash
cd backend
npm install
npm run dev