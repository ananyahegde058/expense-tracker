# 💰 Smart Expense Tracker & Budget Planner

A full-stack personal finance app built with **FastAPI** + **Vanilla JS**. Track daily expenses, set monthly budgets, visualise spending trends, and get budget alerts — all in a clean dark-themed UI.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Auth & Email Verification | Register with email verification. Login is blocked until your email is confirmed |
| 🔑 Forgot / Reset Password | Password reset via email link with 1-hour expiry |
| 📊 Dashboard | Monthly spending stats, pie chart by category, bar chart of trends, and smart insights |
| 🧾 Expense Log | Add, edit, delete, filter, search, and paginate all expense records |
| 📅 Budget Planner | Set monthly limits per category; see % used, "Near Limit" warnings, and "Over by ₹X" banners |
| 👁 Password Visibility Toggle | Show/hide password on all auth inputs |
| 📱 Responsive UI | Works on desktop and mobile browsers |

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.8+, FastAPI, SQLAlchemy, SQLite (or PostgreSQL) |
| Auth | JWT (python-jose), bcrypt password hashing |
| Email | SMTP via Gmail App Password |
| Frontend | Vanilla JS (ES Modules), Chart.js, Lucide Icons |
| Deployment | Render (free tier) |

---

## 📁 Project Structure

```
expense-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, .env loader, static file mount
│   │   ├── auth.py          # JWT helpers
│   │   ├── database.py      # SQLAlchemy engine + session
│   │   ├── email_utils.py   # SMTP email sender
│   │   ├── models.py        # DB models — User, Expense, Budget, Category
│   │   ├── schemas.py       # Pydantic schemas
│   │   └── routers/
│   │       ├── auth.py      # /register /login /verify-email /forgot-password /reset-password
│   │       ├── expenses.py  # CRUD + filter + pagination
│   │       ├── budgets.py   # Budget CRUD + status with exceeded_by
│   │       ├── categories.py
│   │       └── analytics.py # Spending by category, monthly trends, insights
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js           # All UI logic
│       └── api.js           # REST client wrapper
├── .env.example             # Copy this to .env and fill in your values
├── .gitignore
├── render.yaml              # One-click Render deploy config
└── README.md
```

---

## 🚀 Local Development

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/expense-tracker.git
cd expense-tracker

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Configure environment

```bash
cd backend
copy ..\env.example .env          # Windows
# cp ../.env.example .env         # Mac / Linux
```

Open `.env` and fill in your values:

```env
JWT_SECRET_KEY=any-long-random-string-here
APP_BASE_URL=http://localhost:8000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx     # Gmail App Password (see below)
FROM_EMAIL=you@gmail.com

APP_NAME=Smart Expense Tracker
```

#### Getting a Gmail App Password
1. Enable **2-Step Verification** on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Select **Mail** → click **Generate**
4. Paste the 16-character code into `SMTP_PASS`

> **Running without email configured?** That's fine — the app still works. Registration and reset flows will log the token to the terminal instead of sending an email, so you can verify users manually.

### 3. Run

```bash
# Make sure you're inside the backend/ folder
cd backend
uvicorn app.main:app --reload
```

Open **http://localhost:8000** — the app is live. ✅

---

## ☁️ Deploy to Render (free, public URL)

### Step 1 — Push to GitHub

```bash
cd expense-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git push -u origin main
```

### Step 2 — Create a Web Service on Render

1. Go to **https://render.com** → **New** → **Web Service**
2. Connect your GitHub account and select the repo
3. Fill in the build settings:

| Field | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

### Step 3 — Add Environment Variables

Click **Advanced → Add Environment Variable** and add each of these:

| Key | Value |
|---|---|
| `JWT_SECRET_KEY` | Click **Generate** |
| `APP_BASE_URL` | `https://YOUR-APP-NAME.onrender.com` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | your Gmail App Password |
| `FROM_EMAIL` | your Gmail address |
| `APP_NAME` | `Smart Expense Tracker` |

### Step 4 — Deploy

Click **Deploy** — Render will build and start the app in ~2 minutes.

Your app is live at `https://YOUR-APP-NAME.onrender.com` 🎉

> **Tip:** Free Render services sleep after 15 min of inactivity and take ~30 sec to wake. Upgrade to the **$7/month Starter** plan to keep it always on.

---

## 🔄 Pushing Updates

```bash
git add .
git commit -m "Describe your change"
git push
```

Render auto-deploys on every push to `main`.

---

## 🐛 Common Issues

| Problem | Fix |
|---|---|
| `ModuleNotFoundError: No module named 'backend'` | Run `uvicorn app.main:app --reload` from **inside** the `backend/` folder, not from the project root |
| Verification email not arriving | Check that `SMTP_USER` and `SMTP_PASS` are set in `.env`. Look for `[DEV MODE]` in the terminal — it means SMTP is not configured |
| Edit expense gives `[object Object]` error | Hard-refresh the browser with **Ctrl+Shift+R** after replacing `app.js` |
| `422 Unprocessable Entity` on expense update | Caused by a date format mismatch — fixed in the latest `app.js` |
| Gmail App Password not working | Make sure **2-Step Verification** is enabled on the Google account before creating an App Password |

---

## 📄 License

MIT — free to use, modify, and deploy.