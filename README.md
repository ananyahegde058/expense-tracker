# Smart Expense Tracker & Budget Planner

A full-stack personal finance app — FastAPI backend + vanilla JS frontend.

---

## What's New in v2

| Feature | Details |
|---|---|
| Edit expenses in log | Click the ✏️ Edit button on any row to update amount, category, date, or notes inline via modal |
| Budget exceeded display | Budget cards now show a red "Over by ₹X" banner and the dashboard stat card shows total amount overspent |
| Real email verification | On registration, a verification link is sent to the user's inbox. Login is blocked until verified |
| Forgot / Reset password | "Forgot password?" link on login → email with reset link → set new password page |
| Password visibility toggle | 👁 button on all password inputs to show/hide the password |

---

## Local Development

### 1. Clone & setup

```bash
git clone https://github.com/YOUR_USERNAME/expense-tracker.git
cd expense-tracker

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in JWT_SECRET_KEY, SMTP settings, APP_BASE_URL
```

**Gmail setup (for email features):**
1. Go to https://myaccount.google.com/apppasswords
2. Create an App Password for "Mail"
3. Put it in `SMTP_PASS` in your `.env`

> **Dev mode without email:** If you leave `SMTP_USER` / `SMTP_PASS` empty, the app still works — it skips sending emails and logs the verification token to the console. You can manually verify users via the database.

### 3. Run

```bash
cd backend
uvicorn app.main:app --reload
```

Open http://localhost:8000

---

## Deploy to Render (free tier — everyone can use your app)

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

### Step 2 — Create Render service

1. Go to https://render.com → **New** → **Web Service**
2. Connect your GitHub account and select the `expense-tracker` repo
3. Fill in:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Click **Advanced** → **Add Environment Variable** and add:

| Key | Value |
|---|---|
| `JWT_SECRET_KEY` | Click "Generate" or paste a random 32-char string |
| `APP_BASE_URL` | `https://YOUR-APP-NAME.onrender.com` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | your Gmail App Password |
| `FROM_EMAIL` | your Gmail address |
| `APP_NAME` | `Smart Expense Tracker` |

5. Click **Deploy** — Render builds and starts the app (takes ~2 min)
6. Your app is live at `https://YOUR-APP-NAME.onrender.com` 🎉

> **Note:** Free Render services sleep after 15 minutes of inactivity and take ~30 sec to wake up. Upgrade to the $7/month Starter plan to keep it always-on.

---

## Push updates to Git

Whenever you make changes:

```bash
git add .
git commit -m "Describe your change"
git push
```

Render auto-deploys on every push to `main`.

---

## Project Structure

```
expense-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, static file mount
│   │   ├── auth.py          # JWT helpers
│   │   ├── database.py      # SQLAlchemy engine
│   │   ├── email_utils.py   # SMTP email sender
│   │   ├── models.py        # DB models (User, Expense, Budget, Category)
│   │   ├── schemas.py       # Pydantic schemas
│   │   └── routers/
│   │       ├── auth.py      # /register /login /verify-email /forgot-password /reset-password
│   │       ├── expenses.py  # CRUD expenses
│   │       ├── budgets.py   # Budget CRUD + status (includes exceeded_by)
│   │       ├── categories.py
│   │       └── analytics.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── app.js           # All UI logic
│       └── api.js           # REST client
├── .env.example
├── .gitignore
├── render.yaml
└── README.md
```
