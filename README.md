# 💰 Smart Expense Tracker & Budget Planner

> 🌐 **Live Demo:** [https://expense-tracker-1aal.onrender.com](https://expense-tracker-1aal.onrender.com)

A full-stack personal finance web app built from scratch with **FastAPI** (Python) on the backend and **Vanilla JavaScript** on the frontend. Users can register, verify their email, log daily expenses, set monthly budgets per category, and visualise spending trends through an interactive dashboard — all in a clean, dark-themed UI.

---

## 📸 App Overview

| Screen | What it does |
|---|---|
| **Register / Login** | Create an account, verify email, login with JWT auth |
| **Dashboard** | Monthly summary cards, pie chart by category, bar chart of trends, smart insights |
| **Expense Log** | Full CRUD — add, edit, delete, filter by category/date, search by notes, paginate |
| **Budget Planner** | Set monthly limits per category, track % used, see warnings and "Over by ₹X" alerts |
| **Forgot Password** | Request reset link via email, set a new password securely |

---

## ✨ Features

### Authentication
- Register with name, email, and password
- Email verification on registration — login is blocked until email is confirmed
- JWT-based session (stored in `localStorage`, expires in 24 hours)
- Forgot password → email with reset link → set new password (link expires in 1 hour)
- Password visibility toggle (👁) on all password inputs
- bcrypt password hashing — passwords are never stored in plain text

### Expense Management
- Add expenses with amount (₹), category, transaction date, and notes
- Edit any expense via a modal — all fields editable
- Delete expenses with confirmation
- Filter by category and date range
- Search expenses by notes keyword
- Pagination (10 per page)

### Budget Planner
- Set a monthly spending limit for any category
- Live status cards showing amount spent vs limit
- Color-coded indicators: On Track → Near Limit (>80%) → Over Budget (>100%)
- "Over by ₹X" red banner when a category exceeds its budget
- Dashboard stat card shows total amount overspent across all categories

### Dashboard & Analytics
- Total spent this month, number of transactions, biggest category
- Pie chart — spending breakdown by category
- Bar chart — monthly spending trend over last 6 months
- Smart insights — e.g. "You spent 40% of your budget on Food this month"

### UI / UX
- Fully responsive — works on desktop and mobile
- Dark theme throughout
- Toast notifications for all actions (success, error, warning)
- Loading states on all async operations

---

## 🛠 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend framework | FastAPI (Python 3.8+) | Fast, async, auto-generates API docs at `/docs` |
| ORM & database | SQLAlchemy + SQLite | Simple file-based DB, zero config for local dev |
| Auth | python-jose (JWT) + passlib (bcrypt) | Industry-standard token auth + secure hashing |
| Email | Brevo REST API over HTTPS | SMTP is blocked on Render free tier — HTTPS always works |
| Frontend | Vanilla JS (ES Modules) | No build step, fast, lightweight |
| Charts | Chart.js | Simple, beautiful, zero dependencies |
| Icons | Lucide Icons | Clean SVG icon set |
| Fonts | Inter + Outfit (Google Fonts) | Modern, readable typography |
| Deployment | Render (free tier) | Free hosting with auto-deploy from GitHub |

---

## 📁 Project Structure

```
expense-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   │                        # — loads .env automatically (local dev)
│   │   │                        # — sets up CORS
│   │   │                        # — mounts frontend as static files
│   │   │                        # — creates DB tables on startup
│   │   │
│   │   ├── auth.py              # JWT token creation and verification helpers
│   │   ├── database.py          # SQLAlchemy engine, session factory, Base
│   │   ├── models.py            # ORM models: User, Expense, Budget, Category
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   │
│   │   ├── email_utils.py       # Email sender — uses Brevo HTTPS REST API
│   │   │                        # (NOT SMTP — see deployment notes)
│   │   │
│   │   └── routers/
│   │       ├── auth.py          # POST /register
│   │       │                    # POST /login
│   │       │                    # GET  /verify-email?token=...
│   │       │                    # POST /resend-verification
│   │       │                    # POST /forgot-password
│   │       │                    # POST /reset-password
│   │       │
│   │       ├── expenses.py      # GET    /expenses  (filter, search, paginate)
│   │       │                    # POST   /expenses
│   │       │                    # PUT    /expenses/{id}
│   │       │                    # DELETE /expenses/{id}
│   │       │
│   │       ├── budgets.py       # GET  /budgets
│   │       │                    # POST /budgets
│   │       │                    # PUT  /budgets/{id}
│   │       │                    # DELETE /budgets/{id}
│   │       │                    # GET  /budgets/status?month=&year=
│   │       │
│   │       ├── categories.py    # GET /categories (seeded on startup)
│   │       └── analytics.py     # GET /analytics/spending-by-category
│   │                            # GET /analytics/monthly-trends
│   │                            # GET /analytics/insights
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── index.html               # Single HTML file — app shell
│   ├── site.webmanifest         # PWA manifest for mobile install
│   ├── css/
│   │   └── styles.css           # All styles — dark theme, components, responsive
│   ├── js/
│   │   ├── app.js               # All UI logic — routing, rendering, event handlers
│   │   └── api.js               # REST client — all fetch() calls with JWT header
│   └── images/
│       ├── favicon-16.png
│       ├── favicon-32.png
│       ├── apple-touch-icon.png
│       ├── logo-512.png
│       └── og-preview.png       # Open Graph image for social sharing previews
│
├── .env.example                 # Template — copy to .env for local dev
├── .gitignore                   # Excludes .env, expenses.db, __pycache__
├── render.yaml                  # Render deploy config
└── README.md
```

---

## 🗄 Database

The app uses **SQLite** by default — all data lives in a single file `backend/expenses.db`.

### Tables

| Table | Columns | Notes |
|---|---|---|
| `users` | id, name, email, hashed_password, is_verified, verification_token, reset_token, reset_token_expires | Passwords always bcrypt hashed |
| `categories` | id, name, icon, color | 10 defaults seeded on first startup |
| `expenses` | id, user_id, category_id, amount, date, notes, created_at | Filtered by user_id on every query |
| `budgets` | id, user_id, category_id, amount, month, year | One budget per user per category per month |

### View your data locally

**Option 1 — VS Code** (easiest):
Install **SQLite Viewer** extension (by Florian Klampfer) → click `expenses.db` in the file explorer.

**Option 2 — Terminal:**
```bash
cd backend
python -c "
import sqlite3
conn = sqlite3.connect('expenses.db')
print('--- USERS ---')
for row in conn.execute('SELECT id, name, email, is_verified FROM users'): print(row)
print('--- EXPENSES ---')
for row in conn.execute('SELECT * FROM expenses LIMIT 10'): print(row)
"
```

### Upgrading to PostgreSQL

SQLite resets on Render free tier redeploys (no persistent disk). For permanent production data, add a free Render PostgreSQL instance and set:

```env
DATABASE_URL=postgresql://user:password@host/dbname
```

No code changes needed — SQLAlchemy handles both automatically.

---

## 🚀 Local Development

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/expense-tracker.git
cd expense-tracker

# Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Set up Brevo (for email features)

1. Sign up free at **https://brevo.com**
2. Go to **Settings → SMTP & API → API Keys → Generate a new API key** → copy it
3. Go to **Settings → Senders, domains, IPs → Add a sender** → verify your email address

### 3. Configure environment

```bash
cd backend
copy ..\env.example .env      # Windows
# cp ../.env.example .env     # Mac / Linux
```

Edit `.env`:

```env
# Security
JWT_SECRET_KEY=generate-a-long-random-string-here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database (SQLite default — no changes needed for local dev)
DATABASE_URL=sqlite:///./expenses.db

# Email — Brevo API (NOT SMTP)
BREVO_API_KEY=xkeysib-your-api-key-here
FROM_EMAIL=your-verified-sender@gmail.com

# App
APP_NAME=Smart Expense Tracker
APP_BASE_URL=http://localhost:8000
```

> **No email configured?** App still works. Registration and password reset will log the token to the terminal (`[DEV MODE] Email not sent`). You can manually mark users as verified in the database.

### 4. Run

```bash
# ⚠️ Must be run from inside backend/ — not the project root
cd backend
uvicorn app.main:app --reload
```

Open **http://localhost:8000** ✅

API docs available at **http://localhost:8000/docs**

---

## ☁️ Deploy to Render

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

### Step 2 — Create Web Service on Render

1. **https://render.com** → **New** → **Web Service**
2. Connect GitHub → select repo
3. Configure:

| Field | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

### Step 3 — Environment Variables

Click **Advanced → Add Environment Variable:**

| Key | Value |
|---|---|
| `JWT_SECRET_KEY` | click **Generate** |
| `APP_BASE_URL` | `https://expense-tracker-1aal.onrender.com` |
| `APP_NAME` | `Smart Expense Tracker` |
| `BREVO_API_KEY` | your full Brevo API key (`xkeysib-...`) |
| `FROM_EMAIL` | your verified Brevo sender email |

> ⚠️ **Do NOT add SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS.** Render's free tier blocks all outbound TCP connections on ports 587 and 465. This app uses Brevo's HTTPS API (port 443) which is never blocked. See the full story in the Debugging section below.

### Step 4 — Deploy

Click **Deploy** → ~2 minutes → live at **https://expense-tracker-1aal.onrender.com** 🎉

### Step 5 — Auto-deploy on updates

```bash
git add .
git commit -m "your change"
git push
```

Render automatically redeploys on every push to `main`.

> **Free tier note:** Service sleeps after 15 min of inactivity. First request after sleep takes ~30 sec to wake up. Upgrade to $7/month Starter plan for always-on.

---

## 🔧 Complete Debugging Journey

This section documents every real issue encountered during development and deployment — what the error was, why it happened, and exactly how it was fixed.

---

### 🐛 Bug 1 — Emails not sending locally (`[DEV MODE]`)

**Symptom:**
```
[DEV MODE] Email not sent — SMTP_USER / SMTP_PASS not set.
```

**Root cause:**
The original `email_utils.py` called `os.getenv()` at the **top level of the module** — meaning env vars were read once when Python first imported the file. If the `.env` file hadn't been loaded yet at that moment (which was the case), all SMTP values were empty strings forever, even after `.env` was loaded later.

**Fix:**
Moved all `os.getenv()` calls inside a `_get_config()` function that runs fresh on every email send. Added `python-dotenv` to auto-load `.env` in `main.py` before any other imports.

```python
# BEFORE (broken) — read once at import time
SMTP_USER = os.getenv("SMTP_USER", "")

# AFTER (fixed) — read fresh on every call
def _get_config():
    return {"smtp_user": os.getenv("SMTP_USER", "")}
```

---

### 🐛 Bug 2 — Edit expense returning `422 Unprocessable Entity`

**Symptom:**
Clicking "Update Record" on the edit modal showed `[object Object]` error toast. Server logs showed:
```
PUT /api/expenses/2 HTTP/1.1" 422 Unprocessable Entity
```

**Root cause:**
Two separate issues combined:
1. `editRecord.date` from the API contained a timestamp (`2026-06-11T00:00:00`) — the `<input type="date">` couldn't parse this and rendered blank
2. On Windows, some browser locales return the date input `.value` as `DD-MM-YYYY` instead of the standard `YYYY-MM-DD` — which FastAPI's Pydantic schema rejected

**Fix:**
- Strip timestamp on render: `editRecord.date.split('T')[0]`
- Use `valueAsNumber` (milliseconds since epoch — always locale-independent) to read the date back, then convert to `YYYY-MM-DD` using UTC math:

```javascript
const d = new Date(dateInput.valueAsNumber);
const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
```

---

### 🐛 Bug 3 — `ModuleNotFoundError: No module named 'backend'`

**Symptom:**
```
ModuleNotFoundError: No module named 'backend'
```

**Root cause:**
Running this from the project root:
```bash
python -m uvicorn backend.app.main:app
```

Python treats `backend` as a package name and can't find it because there's no `__init__.py` at the project root level.

**Fix:**
Always run uvicorn from **inside** the `backend/` folder:
```bash
cd backend
uvicorn app.main:app --reload
```

---

### 🐛 Bug 4 — Emails not sending on Render (`Network is unreachable`)

**Symptom** (from Render logs):
```
Failed to send email: [Errno 101] Network is unreachable
```
Then after switching to Brevo SMTP:
```
Failed to send email: [Errno 110] Connection timed out
```

**Root cause:**
Render's **free tier deliberately blocks all outbound TCP connections on ports 587 and 465** (standard SMTP ports) at the infrastructure/firewall level. This is a Render platform restriction — not a code bug, not a credentials issue. It affects Gmail SMTP, Brevo SMTP, and every other SMTP provider equally.

**Debugging path:**
1. Checked Render logs → saw `Network is unreachable` on port 587
2. Thought it was a Gmail issue → switched to Brevo SMTP → same error
3. Realised it's the *port* being blocked, not the provider
4. Solution: stop using SMTP entirely

**Fix:**
Rewrote `email_utils.py` to use **Brevo's REST API over HTTPS (port 443)** instead of SMTP. HTTPS is never blocked on any hosting platform. Used Python's built-in `urllib` — no extra dependencies needed:

```python
req = urllib.request.Request(
    "https://api.brevo.com/v3/smtp/email",
    data=payload,
    headers={"api-key": api_key, "content-type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req, timeout=15) as resp:
    # Email sent successfully
```

**Key lesson:** When deploying email functionality, always check whether the hosting platform allows outbound SMTP. Many free tiers (Render, Railway, Heroku) block it. Use an HTTP-based email API instead.

---

### 🐛 Bug 5 — Verification link pointing to localhost in production

**Symptom:**
Email arrived but the "Verify Email" button linked to `http://localhost:8000/?verify_token=...` — clicking it did nothing for real users.

**Root cause:**
`APP_BASE_URL` was set to `http://localhost:8000` in the Render environment variables (copied directly from the example without updating).

**Fix:**
Updated `APP_BASE_URL` in Render dashboard to the actual live URL:
```
https://expense-tracker-1aal.onrender.com
```

---

### 🐛 Bug 6 — `JWT_SECRET_KEY` was the placeholder text

**Symptom:**
JWT tokens were being signed with the string `"Click Generate"` — meaning any attacker who knew this could forge tokens.

**Root cause:**
The Render env var was set to the literal placeholder text from the setup instructions instead of a real secret.

**Fix:**
Generated a proper random secret and updated the Render environment variable:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 🔒 Privacy & Security

| Concern | How it's handled |
|---|---|
| Passwords | bcrypt hashed with salt — never stored in plain text |
| Data isolation | Every query filters by `user_id` from the verified JWT — users can never access each other's data |
| Tokens | Email verification and password reset tokens are single-use, time-limited, and stored hashed |
| Secrets | `JWT_SECRET_KEY` and `BREVO_API_KEY` stored only in environment variables — never in source code |
| `.env` file | Listed in `.gitignore` — never committed to GitHub |
| `expenses.db` | Listed in `.gitignore` — your local data never leaves your machine |

---

## 🌐 SEO & Discoverability

The app includes full SEO meta tags in `index.html`:
- Primary meta (`title`, `description`, `keywords`, `canonical`)
- Open Graph tags for rich previews when shared on WhatsApp, LinkedIn, Twitter
- Structured data (`application/ld+json`) for Google rich results
- Favicon set (16px, 32px, 180px Apple touch icon)
- `site.webmanifest` for PWA installability

To get indexed by Google:
1. Go to **https://search.google.com/search-console**
2. Add `https://expense-tracker-1aal.onrender.com` as a property
3. Verify ownership via the HTML meta tag method
4. Click **Request Indexing**

---

## 🎤 Interview Talking Points

> *"I built a full-stack expense tracker with FastAPI and vanilla JS. During deployment on Render's free tier, I ran into an interesting infrastructure issue — emails stopped working even though everything was fine locally.*
>
> *Debugging the server logs showed `[Errno 101] Network is unreachable` on port 587. I initially thought it was a Gmail credential issue and switched to Brevo — but got the same error. That told me it wasn't a provider problem but a platform-level firewall blocking outbound SMTP entirely.*
>
> *My fix was to stop using SMTP altogether and switch to Brevo's REST API over HTTPS. Port 443 is never blocked. I rewrote the email utility using Python's built-in `urllib` — no new dependencies — and it worked immediately.*
>
> *I also fixed a date format bug where Windows browsers return date inputs as `DD-MM-YYYY` but the API expected `YYYY-MM-DD`. I solved it using `valueAsNumber` which gives milliseconds since epoch — completely locale-independent — and converted that to ISO format using UTC math."*

---

## 📄 License

MIT — free to use, modify, and deploy.

## 👩‍💻 Author

**Ananya Hegde** — [@ananyahegde058](https://github.com/ananyahegde058)

---

## ⭐ Show some love

If this project helped you, give it a star on GitHub!