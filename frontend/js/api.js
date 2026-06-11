// api.js - REST API Client Wrapper v2

const BASE_URL = window.location.hostname
    ? `${window.location.origin}/api`
    : 'http://localhost:8000/api';

async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = options.headers || {};
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;

    if (options.body && !(options.body instanceof URLSearchParams)) {
        headers['Content-Type'] = 'application/json';
        if (typeof options.body === 'object') options.body = JSON.stringify(options.body);
    }

    try {
        const response = await fetch(url, { ...options, headers });

        if (response.status === 204) return null;

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userEmail');
                window.dispatchEvent(new Event('auth-expired'));
            }
            throw new Error(data.detail || 'An API error occurred');
        }

        return data;
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
}

export const api = {
    auth: {
        register: (email, password) =>
            request('/auth/register', { method: 'POST', body: { email, password } }),

        login: async (email, password) => {
            const params = new URLSearchParams();
            params.append('username', email);
            params.append('password', password);
            const response = await request('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });
            if (response && response.access_token) {
                localStorage.setItem('token', response.access_token);
                localStorage.setItem('userEmail', email);
            }
            return response;
        },

        logout: () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            window.dispatchEvent(new Event('auth-logout'));
        },

        getMe: () => request('/auth/me'),
        isAuthenticated: () => !!localStorage.getItem('token'),
        getUserEmail: () => localStorage.getItem('userEmail') || '',

        // Email verification
        verifyEmail: (token) =>
            request('/auth/verify-email', { method: 'POST', body: { token } }),

        resendVerification: (email) =>
            request('/auth/resend-verification', { method: 'POST', body: { email } }),

        // Password reset
        forgotPassword: (email) =>
            request('/auth/forgot-password', { method: 'POST', body: { email } }),

        resetPassword: (token, new_password) =>
            request('/auth/reset-password', { method: 'POST', body: { token, new_password } })
    },

    expenses: {
        list: (params = {}) => {
            const query = new URLSearchParams();
            if (params.start_date) query.append('start_date', params.start_date);
            if (params.end_date) query.append('end_date', params.end_date);
            if (params.category_id) query.append('category_id', params.category_id);
            if (params.min_amount) query.append('min_amount', params.min_amount);
            if (params.max_amount) query.append('max_amount', params.max_amount);
            if (params.search) query.append('search', params.search);
            if (params.limit) query.append('limit', params.limit);
            if (params.offset) query.append('offset', params.offset);
            const qs = query.toString();
            return request(`/expenses${qs ? '?' + qs : ''}`);
        },

        create: (expense) => request('/expenses', { method: 'POST', body: expense }),
        update: (id, expense) => request(`/expenses/${id}`, { method: 'PUT', body: expense }),
        delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' })
    },

    categories: {
        list: () => request('/categories')
    },

    budgets: {
        list: (month, year) => {
            const query = new URLSearchParams();
            if (month) query.append('month', month);
            if (year) query.append('year', year);
            return request(`/budgets${query.toString() ? '?' + query.toString() : ''}`);
        },
        set: (budget) => request('/budgets', { method: 'POST', body: budget }),
        getStatus: (month, year) => {
            const query = new URLSearchParams();
            if (month) query.append('month', month);
            if (year) query.append('year', year);
            return request(`/budgets/status${query.toString() ? '?' + query.toString() : ''}`);
        }
    },

    analytics: {
        getSpendingByCategory: (month, year) => {
            const query = new URLSearchParams();
            if (month) query.append('month', month);
            if (year) query.append('year', year);
            return request(`/analytics/spending-by-category${query.toString() ? '?' + query.toString() : ''}`);
        },
        getMonthlyTrends: () => request('/analytics/monthly-trends'),
        getInsights: () => request('/analytics/insights')
    }
};
