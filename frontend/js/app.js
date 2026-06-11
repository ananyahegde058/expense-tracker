// app.js - Main Application Controller (v2)
import { api } from './api.js';

// ==========================================================================
// 1. Application State & Globals
// ==========================================================================
const state = {
    currentView: 'dashboard',
    categories: [],
    categoriesMap: {},
    expenses: [],
    expensesTotal: 0,
    expensesLimit: 10,
    expensesOffset: 0,
    expensesFilters: {
        category_id: '',
        start_date: '',
        end_date: '',
        search: ''
    },
    budgetsStatus: [],
    dashboardMonth: new Date().getMonth() + 1,
    dashboardYear: new Date().getFullYear(),
    activeCharts: {
        pie: null,
        bar: null
    }
};

const MONTHS = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' },
    { value: 3, name: 'March' }, { value: 4, name: 'April' },
    { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' },
    { value: 9, name: 'September' }, { value: 10, name: 'October' },
    { value: 11, name: 'November' }, { value: 12, name: 'December' }
];

const YEARS = [2024, 2025, 2026, 2027];

// ==========================================================================
// 2. Utility Functions
// ==========================================================================
export function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'warning') iconName = 'alert-circle';
    if (type === 'info') iconName = 'info';

    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <div class="toast-content">${message}</div>
        <div class="toast-close"><i data-lucide="x"></i></div>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toggleLoader(selector, show) {
    const el = document.querySelector(selector);
    if (!el) return;

    let overlay = el.querySelector('.loading-overlay');
    if (!overlay && show) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = '<div class="spinner"></div>';
        el.style.position = 'relative';
        el.appendChild(overlay);
    }
    if (overlay) {
        overlay.classList.toggle('active', show);
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '99, 102, 241';
}

// ==========================================================================
// 3. Navigation & Main Shell
// ==========================================================================
function renderAppShell() {
    const appEl = document.getElementById('app');

    if (!api.auth.isAuthenticated()) {
        // Check for token/reset deep-link params in URL
        const params = new URLSearchParams(window.location.search);
        const verifyToken = params.get('verify_token');
        const resetToken = params.get('reset_token');

        if (verifyToken) {
            renderEmailVerificationPage(verifyToken);
        } else if (resetToken) {
            renderResetPasswordPage(resetToken);
        } else {
            renderAuthPage();
        }
        return;
    }

    const email = api.auth.getUserEmail();

    appEl.innerHTML = `
        <div class="layout-wrapper">
            <aside class="sidebar">
                <div class="sidebar-brand">
                    <div class="sidebar-logo">
                        <i data-lucide="wallet" style="stroke: #ffffff;"></i>
                    </div>
                    <h2>Smart Tracker</h2>
                </div>
                <ul class="sidebar-menu">
                    <li>
                        <a href="#" class="sidebar-link ${state.currentView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
                            <i data-lucide="layout-dashboard"></i>
                            Dashboard
                        </a>
                    </li>
                    <li>
                        <a href="#" class="sidebar-link ${state.currentView === 'expenses' ? 'active' : ''}" data-view="expenses">
                            <i data-lucide="receipt"></i>
                            Expenses Log
                        </a>
                    </li>
                    <li>
                        <a href="#" class="sidebar-link ${state.currentView === 'budgets' ? 'active' : ''}" data-view="budgets">
                            <i data-lucide="pie-chart"></i>
                            Budget Planner
                        </a>
                    </li>
                </ul>
                <div class="sidebar-user">
                    <div class="sidebar-user-info">
                        <span class="sidebar-user-email" title="${email}">${email}</span>
                    </div>
                    <button class="sidebar-logout-btn" id="logout-btn">
                        <i data-lucide="log-out"></i>
                        Logout
                    </button>
                </div>
            </aside>
            <main class="main-content" id="main-content-view"></main>
        </div>
    `;

    lucide.createIcons();
    setupShellListeners();
    loadCurrentView();
}

function setupShellListeners() {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetView = link.getAttribute('data-view');
            if (state.currentView === targetView) return;
            state.currentView = targetView;
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            loadCurrentView();
        });
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
        api.auth.logout();
    });
}

async function loadCurrentView() {
    const mainEl = document.getElementById('main-content-view');
    if (!mainEl) return;

    if (state.activeCharts.pie) { state.activeCharts.pie.destroy(); state.activeCharts.pie = null; }
    if (state.activeCharts.bar) { state.activeCharts.bar.destroy(); state.activeCharts.bar = null; }

    if (state.categories.length === 0) {
        try {
            state.categories = await api.categories.list();
            state.categories.forEach(cat => { state.categoriesMap[cat.id] = cat; });
        } catch (error) {
            showToast('Failed to load categories', 'error');
        }
    }

    if (state.currentView === 'dashboard') renderDashboardPage(mainEl);
    else if (state.currentView === 'expenses') renderExpensesPage(mainEl);
    else if (state.currentView === 'budgets') renderBudgetsPage(mainEl);
}

// ==========================================================================
// 4. Authentication — Login / Register / Verify / Forgot / Reset
// ==========================================================================

/** Helper: attach password toggle to an input wrapper */
function attachPasswordToggle(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const wrapper = input.parentElement;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'password-toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Toggle password visibility');
    toggleBtn.innerHTML = '<i data-lucide="eye"></i>';
    wrapper.appendChild(toggleBtn);
    lucide.createIcons();

    toggleBtn.addEventListener('click', () => {
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        toggleBtn.innerHTML = isHidden
            ? '<i data-lucide="eye-off"></i>'
            : '<i data-lucide="eye"></i>';
        lucide.createIcons();
    });
}

function renderAuthPage(mode = 'login') {
    const appEl = document.getElementById('app');

    appEl.innerHTML = `
        <div class="auth-container">
            <div class="auth-background-blur"></div>
            <div class="auth-background-blur-alt"></div>

            <div class="glass-card auth-card">
                <div class="auth-header">
                    <div class="auth-logo"><i data-lucide="wallet"></i></div>
                    <h1 id="auth-title">Welcome Back</h1>
                    <p id="auth-desc">Log in to track your budget &amp; expenses</p>
                </div>

                <!-- Login / Register form -->
                <form id="auth-form">
                    <div class="form-group">
                        <label class="form-label" for="auth-email">Email Address</label>
                        <div class="input-container">
                            <i data-lucide="mail"></i>
                            <input type="email" id="auth-email" class="form-input" placeholder="you@example.com" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="auth-password">Password</label>
                        <div class="input-container">
                            <i data-lucide="lock"></i>
                            <input type="password" id="auth-password" class="form-input" placeholder="••••••••" required minlength="6">
                        </div>
                    </div>

                    <div style="text-align: right; margin-top: -8px; margin-bottom: 16px;">
                        <a href="#" id="forgot-password-link" style="font-size: 0.82rem; color: var(--accent-secondary); text-decoration: none;">Forgot password?</a>
                    </div>

                    <button type="submit" class="btn-primary" id="auth-submit-btn">
                        <span>Log In</span>
                        <i data-lucide="arrow-right"></i>
                    </button>
                </form>

                <div class="auth-footer">
                    <span id="auth-switch-text">Don't have an account?</span>
                    <a href="#" id="auth-switch-link">Sign Up</a>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
    attachPasswordToggle('auth-password');
    setupAuthListeners();
}

function renderForgotPasswordPage() {
    const appEl = document.getElementById('app');

    appEl.innerHTML = `
        <div class="auth-container">
            <div class="auth-background-blur"></div>
            <div class="auth-background-blur-alt"></div>

            <div class="glass-card auth-card">
                <div class="auth-header">
                    <div class="auth-logo"><i data-lucide="key-round"></i></div>
                    <h1>Forgot Password</h1>
                    <p>Enter your email and we'll send a reset link</p>
                </div>

                <form id="forgot-form">
                    <div class="form-group">
                        <label class="form-label" for="forgot-email">Email Address</label>
                        <div class="input-container">
                            <i data-lucide="mail"></i>
                            <input type="email" id="forgot-email" class="form-input" placeholder="you@example.com" required>
                        </div>
                    </div>

                    <button type="submit" class="btn-primary" id="forgot-submit-btn">
                        <span>Send Reset Link</span>
                        <i data-lucide="send"></i>
                    </button>
                </form>

                <div class="auth-footer">
                    <a href="#" id="back-to-login-link" style="color: var(--accent-secondary);">← Back to Login</a>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();

    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        const btn = document.getElementById('forgot-submit-btn');
        const span = btn.querySelector('span');
        btn.disabled = true;
        span.textContent = 'Sending...';

        try {
            await api.auth.forgotPassword(email);
            showToast('If this email is registered, a reset link has been sent.', 'info');
            setTimeout(() => renderAuthPage(), 2000);
        } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            span.textContent = 'Send Reset Link';
        }
    });

    document.getElementById('back-to-login-link').addEventListener('click', (e) => {
        e.preventDefault();
        renderAuthPage();
    });
}

function renderResetPasswordPage(token) {
    const appEl = document.getElementById('app');

    appEl.innerHTML = `
        <div class="auth-container">
            <div class="auth-background-blur"></div>
            <div class="auth-background-blur-alt"></div>

            <div class="glass-card auth-card">
                <div class="auth-header">
                    <div class="auth-logo"><i data-lucide="shield-check"></i></div>
                    <h1>Set New Password</h1>
                    <p>Choose a strong password (min 6 characters)</p>
                </div>

                <form id="reset-form">
                    <div class="form-group">
                        <label class="form-label" for="reset-password">New Password</label>
                        <div class="input-container">
                            <i data-lucide="lock"></i>
                            <input type="password" id="reset-password" class="form-input" placeholder="••••••••" required minlength="6">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="reset-confirm">Confirm Password</label>
                        <div class="input-container">
                            <i data-lucide="lock"></i>
                            <input type="password" id="reset-confirm" class="form-input" placeholder="••••••••" required minlength="6">
                        </div>
                    </div>

                    <button type="submit" class="btn-primary" id="reset-submit-btn">
                        <span>Reset Password</span>
                        <i data-lucide="check"></i>
                    </button>
                </form>
            </div>
        </div>
    `;

    lucide.createIcons();
    attachPasswordToggle('reset-password');
    attachPasswordToggle('reset-confirm');

    document.getElementById('reset-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = document.getElementById('reset-password').value;
        const confirm = document.getElementById('reset-confirm').value;

        if (pwd !== confirm) {
            showToast('Passwords do not match', 'error');
            return;
        }

        const btn = document.getElementById('reset-submit-btn');
        btn.disabled = true;
        btn.querySelector('span').textContent = 'Resetting...';

        try {
            await api.auth.resetPassword(token, pwd);
            showToast('Password reset successfully! Please log in.', 'success');
            // Clean URL
            window.history.replaceState({}, '', '/');
            setTimeout(() => renderAuthPage(), 1500);
        } catch (err) {
            showToast(err.message, 'error');
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Reset Password';
        }
    });
}

function renderEmailVerificationPage(token) {
    const appEl = document.getElementById('app');

    appEl.innerHTML = `
        <div class="auth-container">
            <div class="auth-background-blur"></div>
            <div class="auth-background-blur-alt"></div>
            <div class="glass-card auth-card" style="text-align: center;">
                <div class="auth-header">
                    <div class="auth-logo"><i data-lucide="mail-check"></i></div>
                    <h1 id="verify-title">Verifying Email...</h1>
                    <p id="verify-desc">Please wait.</p>
                </div>
                <div id="verify-actions" style="margin-top: 20px;"></div>
            </div>
        </div>
    `;

    lucide.createIcons();

    api.auth.verifyEmail(token).then(() => {
        document.getElementById('verify-title').textContent = 'Email Verified! ✓';
        document.getElementById('verify-desc').textContent = 'Your account is active. You can now log in.';
        document.getElementById('verify-actions').innerHTML =
            `<button class="btn-primary" id="go-login-btn"><span>Go to Login</span><i data-lucide="arrow-right"></i></button>`;
        lucide.createIcons();
        window.history.replaceState({}, '', '/');
        document.getElementById('go-login-btn').addEventListener('click', () => renderAuthPage());
    }).catch(err => {
        document.getElementById('verify-title').textContent = 'Verification Failed';
        document.getElementById('verify-desc').textContent = err.message || 'The link may have expired.';
        document.getElementById('verify-actions').innerHTML =
            `<button class="btn-primary" id="go-login-btn2"><span>Back to Login</span><i data-lucide="arrow-right"></i></button>`;
        lucide.createIcons();
        window.history.replaceState({}, '', '/');
        document.getElementById('go-login-btn2').addEventListener('click', () => renderAuthPage());
    });
}

function renderUnverifiedPage(email) {
    const appEl = document.getElementById('app');

    appEl.innerHTML = `
        <div class="auth-container">
            <div class="auth-background-blur"></div>
            <div class="auth-background-blur-alt"></div>
            <div class="glass-card auth-card" style="text-align: center;">
                <div class="auth-header">
                    <div class="auth-logo"><i data-lucide="mail-open"></i></div>
                    <h1>Check your inbox</h1>
                    <p>We sent a verification link to <strong>${email}</strong>. Click it to activate your account.</p>
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn-secondary" id="resend-btn" style="margin-bottom: 12px; width: 100%;">Resend verification email</button>
                    <a href="#" id="back-login" style="color: var(--accent-secondary); font-size: 0.85rem;">← Back to Login</a>
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();

    document.getElementById('resend-btn').addEventListener('click', async () => {
        try {
            await api.auth.resendVerification(email);
            showToast('Verification email resent!', 'info');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    document.getElementById('back-login').addEventListener('click', (e) => {
        e.preventDefault();
        renderAuthPage();
    });
}

function setupAuthListeners() {
    const form = document.getElementById('auth-form');
    const switchLink = document.getElementById('auth-switch-link');
    const titleEl = document.getElementById('auth-title');
    const descEl = document.getElementById('auth-desc');
    const submitBtn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const forgotLink = document.getElementById('forgot-password-link');

    let isLoginMode = true;

    switchLink.addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;

        if (isLoginMode) {
            titleEl.textContent = 'Welcome Back';
            descEl.textContent = 'Log in to track your budget & expenses';
            submitBtn.querySelector('span').textContent = 'Log In';
            switchText.textContent = "Don't have an account? ";
            switchLink.textContent = 'Sign Up';
            forgotLink.style.display = 'block';
        } else {
            titleEl.textContent = 'Create Account';
            descEl.textContent = 'Start managing your finances today';
            submitBtn.querySelector('span').textContent = 'Register';
            switchText.textContent = 'Already have an account? ';
            switchLink.textContent = 'Log In';
            forgotLink.style.display = 'none';
        }
        form.reset();
    });

    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        renderForgotPasswordPage();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;

        submitBtn.disabled = true;
        const btnText = submitBtn.querySelector('span');
        const originalText = btnText.textContent;
        btnText.textContent = isLoginMode ? 'Logging in...' : 'Registering...';

        try {
            if (isLoginMode) {
                await api.auth.login(email, password);
                showToast('Welcome back! Logged in successfully.');
                renderAppShell();
            } else {
                await api.auth.register(email, password);
                renderUnverifiedPage(email);
            }
        } catch (error) {
            // Handle unverified email specifically
            if (error.message && error.message.toLowerCase().includes('verify')) {
                renderUnverifiedPage(email);
            } else {
                showToast(error.message, 'error');
                submitBtn.disabled = false;
                btnText.textContent = originalText;
            }
        }
    });
}

// ==========================================================================
// 5. Dashboard
// ==========================================================================
async function renderDashboardPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <h1>Financial Dashboard</h1>
                <p>Welcome back! Check your spending and budgets at a glance.</p>
            </div>
            <div class="dashboard-controls" style="display: flex; gap: 12px; align-items: center;">
                <select id="dash-month-select" class="filter-select" style="min-width: 130px;"></select>
                <select id="dash-year-select" class="filter-select" style="min-width: 100px;"></select>
                <button class="btn-icon" id="dash-add-expense-btn">
                    <i data-lucide="plus"></i>
                    Add Expense
                </button>
            </div>
        </div>

        <div class="stats-grid" id="dashboard-stats"></div>

        <div class="charts-grid">
            <div class="glass-card chart-card" id="category-chart-wrapper">
                <h3>Spending by Category</h3>
                <div class="chart-container">
                    <canvas id="categoryPieChart"></canvas>
                </div>
            </div>
            <div class="glass-card chart-card" id="trends-chart-wrapper">
                <h3>Monthly Spending Trends</h3>
                <div class="chart-container">
                    <canvas id="monthlyTrendsChart"></canvas>
                </div>
            </div>
        </div>

        <div class="insights-section">
            <h3>Visual Insights &amp; Budget Alerts</h3>
            <div class="insights-list" id="dashboard-insights"></div>
        </div>

        <div class="modal-overlay" id="expense-modal-overlay"></div>
    `;

    const mSelect = document.getElementById('dash-month-select');
    const ySelect = document.getElementById('dash-year-select');

    MONTHS.forEach(m => {
        mSelect.innerHTML += `<option value="${m.value}" ${m.value === state.dashboardMonth ? 'selected' : ''}>${m.name}</option>`;
    });
    YEARS.forEach(y => {
        ySelect.innerHTML += `<option value="${y}" ${y === state.dashboardYear ? 'selected' : ''}>${y}</option>`;
    });

    mSelect.addEventListener('change', () => { state.dashboardMonth = parseInt(mSelect.value); updateDashboardData(); });
    ySelect.addEventListener('change', () => { state.dashboardYear = parseInt(ySelect.value); updateDashboardData(); });

    document.getElementById('dash-add-expense-btn').addEventListener('click', () => openExpenseModal());

    lucide.createIcons();
    await updateDashboardData();
}

async function updateDashboardData() {
    toggleLoader('#dashboard-stats', true);
    toggleLoader('#category-chart-wrapper', true);
    toggleLoader('#trends-chart-wrapper', true);
    toggleLoader('#dashboard-insights', true);

    try {
        const [budgetsStatus, categorySpend, monthlyTrends, insights] = await Promise.all([
            api.budgets.getStatus(state.dashboardMonth, state.dashboardYear),
            api.analytics.getSpendingByCategory(state.dashboardMonth, state.dashboardYear),
            api.analytics.getMonthlyTrends(),
            api.analytics.getInsights()
        ]);

        state.budgetsStatus = budgetsStatus;

        let totalSpend = categorySpend.reduce((acc, cat) => acc + cat.total, 0);
        let totalBudget = budgetsStatus.reduce((acc, b) => acc + b.budget_amount, 0);
        let budgetPct = totalBudget > 0 ? Math.round((totalSpend / totalBudget) * 100) : 0;
        let alertsCount = budgetsStatus.filter(b => b.alert).length;
        let totalExceededBy = budgetsStatus.reduce((acc, b) => acc + (b.exceeded_by || 0), 0);

        const statsEl = document.getElementById('dashboard-stats');
        statsEl.innerHTML = `
            <div class="glass-card stat-card">
                <div class="stat-icon" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-primary);">
                    <i data-lucide="banknote"></i>
                </div>
                <div class="stat-info">
                    <span class="stat-label">Total Spend</span>
                    <span class="stat-value">${formatCurrency(totalSpend)}</span>
                    <span class="stat-sub">This Month</span>
                </div>
            </div>

            <div class="glass-card stat-card">
                <div class="stat-icon" style="background: rgba(168, 85, 247, 0.15); color: var(--accent-secondary);">
                    <i data-lucide="calculator"></i>
                </div>
                <div class="stat-info">
                    <span class="stat-label">Total Budget</span>
                    <span class="stat-value">${formatCurrency(totalBudget)}</span>
                    <span class="stat-sub">${budgetsStatus.filter(b => b.budget_amount > 0).length} Categories Set</span>
                </div>
            </div>

            <div class="glass-card stat-card">
                <div class="stat-icon" style="background: ${budgetPct >= 100 ? 'rgba(239, 68, 68, 0.15)' : budgetPct >= 80 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${budgetPct >= 100 ? 'var(--color-danger)' : budgetPct >= 80 ? 'var(--color-warning)' : 'var(--color-success)'};">
                    <i data-lucide="activity"></i>
                </div>
                <div class="stat-info">
                    <span class="stat-label">Budget Used</span>
                    <span class="stat-value">${budgetPct}%</span>
                    <span class="stat-sub">${budgetPct >= 100 ? 'Budget Exceeded!' : budgetPct >= 80 ? 'Approaching Limit' : 'Safe Zone'}</span>
                </div>
            </div>

            <div class="glass-card stat-card">
                <div class="stat-icon" style="background: ${alertsCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; color: ${alertsCount > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
                    <i data-lucide="${totalExceededBy > 0 ? 'trending-up' : 'bell'}"></i>
                </div>
                <div class="stat-info">
                    <span class="stat-label">${totalExceededBy > 0 ? 'Over Budget' : 'Budget Alerts'}</span>
                    <span class="stat-value">${totalExceededBy > 0 ? formatCurrency(totalExceededBy) : alertsCount}</span>
                    <span class="stat-sub">${totalExceededBy > 0 ? 'Total exceeded amount' : alertsCount > 0 ? 'Exceeded >80% limit' : 'All budgets healthy'}</span>
                </div>
            </div>
        `;

        renderCategoryPieChart(categorySpend);
        renderMonthlyTrendsChart(monthlyTrends);

        const insightsEl = document.getElementById('dashboard-insights');
        if (insights.length === 0) {
            insightsEl.innerHTML = `
                <div class="insight-card insight-card-info">
                    <i data-lucide="info"></i>
                    <div class="insight-text">Welcome to your dashboard! Log daily expenses and set budgets to populate alerts and spending trends.</div>
                </div>
            `;
        } else {
            insightsEl.innerHTML = insights.map(ins => `
                <div class="insight-card insight-card-${ins.type}">
                    <i data-lucide="${ins.type === 'success' ? 'check-circle' : ins.type === 'warning' ? 'alert-triangle' : 'info'}"></i>
                    <div class="insight-text">${ins.message}</div>
                </div>
            `).join('');
        }

        lucide.createIcons();
    } catch (error) {
        showToast('Error loading dashboard data', 'error');
    } finally {
        toggleLoader('#dashboard-stats', false);
        toggleLoader('#category-chart-wrapper', false);
        toggleLoader('#trends-chart-wrapper', false);
        toggleLoader('#dashboard-insights', false);
    }
}

function renderCategoryPieChart(data) {
    const ctx = document.getElementById('categoryPieChart');
    if (!ctx) return;
    if (state.activeCharts.pie) { state.activeCharts.pie.destroy(); }

    if (data.length === 0) {
        ctx.style.display = 'none';
        const wrapper = ctx.parentNode;
        let emptyEl = wrapper.querySelector('.chart-empty');
        if (!emptyEl) {
            emptyEl = document.createElement('div');
            emptyEl.className = 'chart-empty';
            emptyEl.innerHTML = `<i data-lucide="pie-chart"></i><p>No data recorded for this month</p>`;
            wrapper.appendChild(emptyEl);
            lucide.createIcons();
        }
        return;
    }

    ctx.style.display = 'block';
    const emptyEl = ctx.parentNode.querySelector('.chart-empty');
    if (emptyEl) emptyEl.remove();

    state.activeCharts.pie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(item => `${item.icon || ''} ${item.category_name}`),
            datasets: [{
                data: data.map(item => item.total),
                backgroundColor: data.map(item => item.color || '#6366f1'),
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                hoverOffset: 12
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f8fafc', font: { family: 'Inter', size: 12 }, padding: 15 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            return ` ${formatCurrency(value)} (${((value / total) * 100).toFixed(1)}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

function renderMonthlyTrendsChart(data) {
    const ctx = document.getElementById('monthlyTrendsChart');
    if (!ctx) return;
    if (state.activeCharts.bar) { state.activeCharts.bar.destroy(); }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    state.activeCharts.bar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => `${monthNames[item.month - 1]} ${item.year}`),
            datasets: [{
                label: 'Monthly Spending',
                data: data.map(item => item.total),
                backgroundColor: 'rgba(99, 102, 241, 0.65)',
                borderColor: '#6366f1',
                borderWidth: 1.5,
                borderRadius: 8,
                hoverBackgroundColor: 'rgba(99, 102, 241, 0.85)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter' } } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { family: 'Inter' }, callback: v => '₹' + v } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ==========================================================================
// 6. Expenses Log — with inline Edit support
// ==========================================================================
function renderExpensesPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <h1>Expense Registry</h1>
                <p>Track, filter, and edit your raw financial records.</p>
            </div>
            <button class="btn-icon" id="expenses-add-btn">
                <i data-lucide="plus"></i>
                Add Expense
            </button>
        </div>

        <div class="glass-card filter-bar" id="expenses-toolbar">
            <div class="filter-group">
                <label>Category</label>
                <select id="filter-category" class="filter-select">
                    <option value="">All Categories</option>
                </select>
            </div>
            <div class="filter-group">
                <label>Start Date</label>
                <input type="date" id="filter-start-date" class="filter-input">
            </div>
            <div class="filter-group">
                <label>End Date</label>
                <input type="date" id="filter-end-date" class="filter-input">
            </div>
            <div class="filter-group" style="min-width: 200px;">
                <label>Search Notes</label>
                <input type="text" id="filter-search" class="filter-input" placeholder="Type notes key...">
            </div>
            <button class="btn-reset" id="filter-reset-btn">Reset Filters</button>
        </div>

        <div class="glass-card" style="position: relative;" id="expenses-table-card">
            <div class="table-container">
                <table class="custom-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Notes</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="expenses-table-body"></tbody>
                </table>
            </div>

            <div class="pagination-bar">
                <span id="pagination-status">Showing 0-0 of 0 records</span>
                <div class="pagination-buttons">
                    <button class="btn-pagination" id="pag-prev-btn" disabled>Previous</button>
                    <button class="btn-pagination" id="pag-next-btn" disabled>Next</button>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="expense-modal-overlay"></div>
    `;

    const categorySelect = document.getElementById('filter-category');
    state.categories.forEach(cat => {
        categorySelect.innerHTML += `<option value="${cat.id}">${cat.icon || ''} ${cat.name}</option>`;
    });

    document.getElementById('filter-category').value = state.expensesFilters.category_id;
    document.getElementById('filter-start-date').value = state.expensesFilters.start_date;
    document.getElementById('filter-end-date').value = state.expensesFilters.end_date;
    document.getElementById('filter-search').value = state.expensesFilters.search;

    setupExpensesPageListeners();
    loadExpensesData();
}

function setupExpensesPageListeners() {
    const updateFilters = () => {
        state.expensesFilters.category_id = document.getElementById('filter-category').value;
        state.expensesFilters.start_date = document.getElementById('filter-start-date').value;
        state.expensesFilters.end_date = document.getElementById('filter-end-date').value;
        state.expensesFilters.search = document.getElementById('filter-search').value;
        state.expensesOffset = 0;
        loadExpensesData();
    };

    document.getElementById('filter-category').addEventListener('change', updateFilters);
    document.getElementById('filter-start-date').addEventListener('change', updateFilters);
    document.getElementById('filter-end-date').addEventListener('change', updateFilters);

    let searchTimeout;
    document.getElementById('filter-search').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(updateFilters, 500);
    });

    document.getElementById('filter-reset-btn').addEventListener('click', () => {
        document.getElementById('filter-category').value = '';
        document.getElementById('filter-start-date').value = '';
        document.getElementById('filter-end-date').value = '';
        document.getElementById('filter-search').value = '';
        state.expensesFilters = { category_id: '', start_date: '', end_date: '', search: '' };
        state.expensesOffset = 0;
        loadExpensesData();
    });

    document.getElementById('pag-prev-btn').addEventListener('click', () => {
        if (state.expensesOffset >= state.expensesLimit) {
            state.expensesOffset -= state.expensesLimit;
            loadExpensesData();
        }
    });

    document.getElementById('pag-next-btn').addEventListener('click', () => {
        if (state.expensesOffset + state.expensesLimit < state.expensesTotal) {
            state.expensesOffset += state.expensesLimit;
            loadExpensesData();
        }
    });

    document.getElementById('expenses-add-btn').addEventListener('click', () => openExpenseModal());
}

async function loadExpensesData() {
    toggleLoader('#expenses-table-card', true);
    try {
        const response = await api.expenses.list({
            ...state.expensesFilters,
            limit: state.expensesLimit,
            offset: state.expensesOffset
        });
        state.expenses = response.expenses;
        state.expensesTotal = response.total;
        renderExpensesTable();
    } catch (error) {
        showToast('Failed to load expenses list', 'error');
    } finally {
        toggleLoader('#expenses-table-card', false);
    }
}

function renderExpensesTable() {
    const tbody = document.getElementById('expenses-table-body');
    const paginationStatus = document.getElementById('pagination-status');
    const prevBtn = document.getElementById('pag-prev-btn');
    const nextBtn = document.getElementById('pag-next-btn');

    if (state.expenses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">
                    No matching expense records found.
                </td>
            </tr>
        `;
        paginationStatus.textContent = `Showing 0-0 of 0 records`;
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    tbody.innerHTML = state.expenses.map(exp => {
        const cat = exp.category || {};
        const catBadgeBg = cat.color
            ? `background: rgba(${hexToRgb(cat.color)}, 0.15); color: ${cat.color}; border: 1px solid rgba(${hexToRgb(cat.color)}, 0.25)`
            : '';

        return `
            <tr data-expense-id="${exp.id}">
                <td class="cell-view">${formatDate(exp.date)}</td>
                <td class="cell-view">
                    <span class="category-badge-item" style="${catBadgeBg}">
                        ${cat.icon || '⚙️'} ${cat.name || 'Others'}
                    </span>
                </td>
                <td class="cell-view amount-text">${formatCurrency(exp.amount)}</td>
                <td class="cell-view" style="color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${exp.notes || '<span style="color: var(--text-muted); font-style: italic;">No notes</span>'}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" data-id="${exp.id}" title="Edit">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="btn-delete" data-id="${exp.id}" title="Delete">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();

    // Edit button → open modal pre-filled with record data
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.getAttribute('data-id'));
            const record = state.expenses.find(e => e.id === id);
            openExpenseModal(record);
        });
    });

    // Delete button
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.getAttribute('data-id'));
            if (confirm('Delete this expense record? This cannot be undone.')) {
                try {
                    await api.expenses.delete(id);
                    showToast('Expense deleted successfully.');
                    loadExpensesData();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
    });

    const startRange = state.expensesOffset + 1;
    const endRange = Math.min(state.expensesOffset + state.expensesLimit, state.expensesTotal);
    paginationStatus.textContent = `Showing ${startRange}-${endRange} of ${state.expensesTotal} records`;
    prevBtn.disabled = state.expensesOffset === 0;
    nextBtn.disabled = state.expensesOffset + state.expensesLimit >= state.expensesTotal;
}

// Universal Add/Edit Expense Modal
function openExpenseModal(editRecord = null) {
    const overlay = document.getElementById('expense-modal-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
        <div class="glass-card modal-container">
            <div class="modal-header">
                <h2>${editRecord ? 'Edit Expense Record' : 'Add Expense Record'}</h2>
                <button class="btn-close-modal" id="modal-close-btn">
                    <i data-lucide="x"></i>
                </button>
            </div>

            <form id="expense-modal-form">
                <div class="form-group">
                    <label class="form-label" for="modal-amount">Amount (₹)</label>
                    <div class="input-container">
                        <i data-lucide="indian-rupee"></i>
                        <input type="number" step="0.01" id="modal-amount" class="form-input" placeholder="0.00"
                            value="${editRecord ? editRecord.amount : ''}" required min="0.01">
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="modal-category">Category</label>
                    <select id="modal-category" class="filter-select" required style="padding-left: 14px;">
                        <option value="" disabled ${!editRecord ? 'selected' : ''}>Choose a category...</option>
                        ${state.categories.map(c => `
                            <option value="${c.id}" ${editRecord && editRecord.category_id === c.id ? 'selected' : ''}>
                                ${c.icon || ''} ${c.name}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label" for="modal-date">Transaction Date</label>
                    <input type="date" id="modal-date" class="form-input" style="padding-left: 14px;"
                        value="${editRecord ? editRecord.date.split('T')[0] : new Date().toISOString().split('T')[0]}" required>
                </div>

                <div class="form-group">
                    <label class="form-label" for="modal-notes">Notes</label>
                    <input type="text" id="modal-notes" class="form-input" style="padding-left: 14px;"
                        placeholder="Grocery details, fuel, movie name..."
                        value="${editRecord ? editRecord.notes || '' : ''}">
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn-secondary" id="modal-cancel-btn">Cancel</button>
                    <button type="submit" class="btn-primary" style="width: auto;">
                        <span>${editRecord ? 'Update Record' : 'Save Record'}</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    overlay.classList.add('active');
    lucide.createIcons();

    const closeModal = () => overlay.classList.remove('active');
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);

    document.getElementById('expense-modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('modal-amount').value);
        const category_id = parseInt(document.getElementById('modal-category').value);
        const rawDate = document.getElementById('modal-date').value;
        // Normalise date to YYYY-MM-DD regardless of browser locale
        let date = rawDate;
        if (rawDate && rawDate.includes('-')) {
            const parts = rawDate.split('-');
            if (parts.length === 3 && parts[0].length === 2) {
                date = parts[2] + '-' + parts[1] + '-' + parts[0];
            }
        }
        if (!date) { showToast('Please select a valid date', 'error'); return; }
        const notes = document.getElementById('modal-notes').value;

        const submitBtn = e.target.querySelector('[type="submit"]');
        submitBtn.disabled = true;

        try {
            if (editRecord) {
                await api.expenses.update(editRecord.id, { amount, category_id, date, notes });
                showToast('Expense updated successfully.');
            } else {
                await api.expenses.create({ amount, category_id, date, notes });
                showToast('Expense saved successfully.');
            }
            closeModal();
            if (state.currentView === 'expenses') loadExpensesData();
            else if (state.currentView === 'dashboard') updateDashboardData();
        } catch (error) {
            showToast(error.message, 'error');
            submitBtn.disabled = false;
        }
    });
}

// ==========================================================================
// 7. Budget Planner — shows exceeded amount
// ==========================================================================
function renderBudgetsPage(container) {
    container.innerHTML = `
        <div class="page-header">
            <div class="page-title">
                <h1>Monthly Budget Planner</h1>
                <p>Set targets for each category and track overruns in real time.</p>
            </div>
            <div class="dashboard-controls" style="display: flex; gap: 12px; align-items: center;">
                <select id="budget-month-select" class="filter-select" style="min-width: 130px;"></select>
                <select id="budget-year-select" class="filter-select" style="min-width: 100px;"></select>
            </div>
        </div>

        <div class="budget-cards-grid" id="budgets-status-grid" style="position: relative; min-height: 200px;"></div>

        <div class="modal-overlay" id="budget-modal-overlay"></div>
    `;

    const mSelect = document.getElementById('budget-month-select');
    const ySelect = document.getElementById('budget-year-select');

    MONTHS.forEach(m => {
        mSelect.innerHTML += `<option value="${m.value}" ${m.value === state.dashboardMonth ? 'selected' : ''}>${m.name}</option>`;
    });
    YEARS.forEach(y => {
        ySelect.innerHTML += `<option value="${y}" ${y === state.dashboardYear ? 'selected' : ''}>${y}</option>`;
    });

    mSelect.addEventListener('change', () => { state.dashboardMonth = parseInt(mSelect.value); loadBudgetsData(); });
    ySelect.addEventListener('change', () => { state.dashboardYear = parseInt(ySelect.value); loadBudgetsData(); });

    loadBudgetsData();
}

async function loadBudgetsData() {
    toggleLoader('#budgets-status-grid', true);
    try {
        const statusList = await api.budgets.getStatus(state.dashboardMonth, state.dashboardYear);
        state.budgetsStatus = statusList;
        renderBudgetCards();
    } catch (error) {
        showToast('Failed to load budget layout', 'error');
    } finally {
        toggleLoader('#budgets-status-grid', false);
    }
}

function renderBudgetCards() {
    const grid = document.getElementById('budgets-status-grid');
    if (!grid) return;

    if (state.budgetsStatus.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px;">No categories config loaded.</div>`;
        return;
    }

    grid.innerHTML = state.budgetsStatus.map(b => {
        const isSet = b.budget_amount > 0;
        const color = b.color || '#6366f1';
        const isExceeded = b.percentage >= 100.0;
        const isWarning = b.percentage >= 80.0 && !isExceeded;

        let fillBgColor = 'var(--accent-primary)';
        let statusBadgeClass = 'badge-success';
        let statusText = 'Under Limit';

        if (isExceeded) {
            fillBgColor = 'var(--color-danger)';
            statusBadgeClass = 'badge-danger';
            statusText = 'Exceeded';
        } else if (isWarning) {
            fillBgColor = 'var(--color-warning)';
            statusBadgeClass = 'badge-warning';
            statusText = 'Near Limit';
        } else if (!isSet) {
            statusBadgeClass = 'badge-info';
            statusText = 'Not Set';
        }

        // ── NEW: exceeded-by row ──
        const exceededRow = isExceeded && b.exceeded_by > 0 ? `
            <div class="budget-exceeded-banner">
                <i data-lucide="trending-up" style="width:14px;height:14px;"></i>
                <span>Over by <strong>${formatCurrency(b.exceeded_by)}</strong></span>
            </div>
        ` : '';

        return `
            <div class="glass-card budget-card">
                <div class="budget-card-header">
                    <div class="budget-category-title">
                        <span class="budget-cat-icon" style="background: rgba(${hexToRgb(color)}, 0.15); color: ${color};">
                            ${b.icon || '⚙️'}
                        </span>
                        <h3>${b.category_name}</h3>
                    </div>
                    <span class="badge ${statusBadgeClass}">${statusText}</span>
                </div>

                <div class="budget-card-limits">
                    <span class="budget-amt-current" style="${isExceeded ? 'color: var(--color-danger);' : ''}">${formatCurrency(b.current_spending)}</span>
                    <span class="budget-amt-total">of ${isSet ? formatCurrency(b.budget_amount) : 'No limit'}</span>
                </div>

                <div class="budget-progress-wrapper" style="margin-top: 15px;">
                    <div class="budget-progress-track">
                        <div class="budget-progress-fill" style="width: ${Math.min(b.percentage, 100)}%; background-color: ${fillBgColor};"></div>
                    </div>
                </div>

                ${exceededRow}

                <div class="budget-card-footer">
                    <span>${isSet ? `${b.percentage}% used` : 'No budget set'}</span>
                    <button class="btn-budget-adjust" data-category-id="${b.category_id}" data-budget-amount="${b.budget_amount}">
                        <i data-lucide="edit-2" style="width:12px;height:12px;"></i>
                        Set Limit
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();

    grid.querySelectorAll('.btn-budget-adjust').forEach(btn => {
        btn.addEventListener('click', () => {
            openBudgetModal(parseInt(btn.getAttribute('data-category-id')), parseFloat(btn.getAttribute('data-budget-amount')));
        });
    });
}

function openBudgetModal(categoryId, currentAmount = 0.0) {
    const overlay = document.getElementById('budget-modal-overlay');
    if (!overlay) return;

    const cat = state.categoriesMap[categoryId] || {};
    const monthObj = MONTHS.find(m => m.value === state.dashboardMonth) || {};

    overlay.innerHTML = `
        <div class="glass-card modal-container">
            <div class="modal-header">
                <h2>Set Category Limit</h2>
                <button class="btn-close-modal" id="budget-modal-close-btn">
                    <i data-lucide="x"></i>
                </button>
            </div>

            <form id="budget-modal-form">
                <div style="margin-bottom: 20px; font-size: 0.95rem; color: var(--text-secondary);">
                    Adjust limit for <strong>${cat.name}</strong> (${monthObj.name} ${state.dashboardYear})
                </div>

                <div class="form-group">
                    <label class="form-label" for="budget-modal-amount">Monthly Budget Limit (₹)</label>
                    <div class="input-container">
                        <i data-lucide="indian-rupee"></i>
                        <input type="number" step="0.01" id="budget-modal-amount" class="form-input"
                            placeholder="e.g. 5000" value="${currentAmount > 0 ? currentAmount : ''}" required min="0.01">
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn-secondary" id="budget-modal-cancel-btn">Cancel</button>
                    <button type="submit" class="btn-primary" style="width: auto;">
                        <span>Save Limit</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    overlay.classList.add('active');
    lucide.createIcons();

    const closeModal = () => overlay.classList.remove('active');
    document.getElementById('budget-modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('budget-modal-cancel-btn').addEventListener('click', closeModal);

    document.getElementById('budget-modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('budget-modal-amount').value);

        try {
            await api.budgets.set({ category_id: categoryId, amount, month: state.dashboardMonth, year: state.dashboardYear });
            showToast('Monthly budget configured successfully.');
            closeModal();
            loadBudgetsData();
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

// ==========================================================================
// 8. Event Listeners & Bootloader
// ==========================================================================
window.addEventListener('auth-expired', () => {
    showToast('Your session has expired. Please log in again.', 'warning');
    renderAppShell();
});

window.addEventListener('auth-logout', () => {
    showToast('Logged out successfully.');
    renderAppShell();
});

document.addEventListener('DOMContentLoaded', () => {
    renderAppShell();
});