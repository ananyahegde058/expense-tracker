# 💰 Smart Expense Tracker & Budget Planner

> A full-stack personal finance app built with **FastAPI** + **Vanilla JS**. Track daily expenses, set monthly budgets, visualise spending trends, and get budget alerts — all in a clean dark-themed UI.

## 🚀 Live Demo

**[https://expense-tracker-1aal.onrender.com/](https://expense-tracker-1aal.onrender.com/)**

> ⚠️ Hosted on Render free tier — may take 30–60 seconds to wake up on first visit.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Auth & Email Verification | Register with email verification. Login is blocked until your email is confirmed |
| 🔑 Forgot / Reset Password | Password reset via email link with 1-hour expiry |
| 📊 Dashboard | Monthly spending stats, pie chart by category, bar chart of trends, and smart insights |
| ➕ Add / Edit / Delete Expenses | Full CRUD with category, date, amount, and notes |
| 🗂️ Category Management | Default + custom categories per user |
| 💸 Budget Planner | Set monthly budgets per category |
| 🔔 Budget Alerts | Visual alert when 80% of a budget is consumed |
| 🔍 Filter & Search | Filter expenses by date range, category, and amount |
| 📄 Pagination | Limit + offset pagination on all expense lists |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Database | PostgreSQL + SQLAlchemy ORM |
| Auth | JWT (PyJWT) + bcrypt password hashing |
| Frontend | Vanilla JS + Chart.js |
| Deployment | Render (free tier) |

---

## 🗄️ Database Schema

```
users ──< expenses >── categories
users ──< budgets  >── categories
```

**4 tables:** `users`, `categories`, `expenses`, `budgets`
- Foreign keys enforce referential integrity
- Indexes on `user_id`, `date`, and `category_id` for fast filtering
- Schema is in 3NF — no transitive dependencies

---

## 📁 Project Structure

```
expense-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + CORS + router registration
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   ├── database.py      # DB engine + session
│   │   ├── auth.py          # JWT + bcrypt utilities
│   │   └── routers/
│   │       ├── auth.py      # /auth/register, /auth/login
│   │       ├── expenses.py  # CRUD + filters + pagination
│   │       ├── budgets.py   # Budget CRUD + alert logic
│   │       └── analytics.py # /analytics/summary (GROUP BY queries)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   └── assets/
│       ├── app.js
│       └── style.css
├── render.yaml
└── README.md
```

---

## ⚙️ Run Locally

### Prerequisites
- Python 3.10+
- PostgreSQL running locally

### Backend

```bash
git clone https://github.com/ananyahegde058/expense-tracker.git
cd expense-tracker/backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — add your DATABASE_URL and SECRET_KEY

uvicorn app.main:app --reload
```

API runs at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

### Frontend

Open `frontend/index.html` directly in your browser, or use Live Server in VS Code.

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | Login, returns JWT |
| GET | `/expenses/` | ✅ | List expenses (filter + paginate) |
| POST | `/expenses/` | ✅ | Create expense |
| PUT | `/expenses/{id}` | ✅ | Update expense |
| DELETE | `/expenses/{id}` | ✅ | Delete expense |
| GET | `/budgets/` | ✅ | List budgets with % spent + alerts |
| POST | `/budgets/` | ✅ | Create budget |
| GET | `/analytics/summary` | ✅ | Spending by category + monthly trend |

---

## 🌍 Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost/expense_tracker
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

---

## 📦 Deployment

Deployed on **[Render](https://render.com)** using `render.yaml`.

- Backend: Render Web Service (Python)
- Database: Render PostgreSQL (free tier)
- Frontend: Served as static files

---

## 👩‍💻 Author

**Ananya Hegde** — [@ananyahegde058](https://github.com/ananyahegde058)

---

## ⭐ Show some love

If this project helped you, give it a star on GitHub!