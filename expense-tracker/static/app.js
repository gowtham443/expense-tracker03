// ExpenseFlow - Hybrid Frontend Application Logic
// Supports both Backend API (FastAPI) and Browser LocalStorage (Offline / file://)

// Detect Environment
const isFileProtocol = window.location.protocol === 'file:';
let isOfflineMode = isFileProtocol;

// Default Seed Categories
const DEFAULT_CATEGORIES = [
    { id: 1, name: "Food & Dining", type: "expense", color: "#F59E0B", icon: "utensils", monthly_budget: 500.0 },
    { id: 2, name: "Housing & Rent", type: "expense", color: "#EF4444", icon: "home", monthly_budget: 1200.0 },
    { id: 3, name: "Utilities & Bills", type: "expense", color: "#3B82F6", icon: "zap", monthly_budget: 200.0 },
    { id: 4, name: "Transportation", type: "expense", color: "#10B981", icon: "car", monthly_budget: 150.0 },
    { id: 5, name: "Entertainment", type: "expense", color: "#8B5CF6", icon: "film", monthly_budget: 150.0 },
    { id: 6, name: "Shopping", type: "expense", color: "#EC4899", icon: "shopping-bag", monthly_budget: 250.0 },
    { id: 7, name: "Healthcare", type: "expense", color: "#14B8A6", icon: "activity", monthly_budget: 100.0 },
    { id: 8, name: "Salary", type: "income", color: "#22C55E", icon: "briefcase", monthly_budget: 0.0 },
    { id: 9, name: "Freelance", type: "income", color: "#06B6D4", icon: "laptop", monthly_budget: 0.0 },
    { id: 10, name: "Investments", type: "income", color: "#6366F1", icon: "trending-up", monthly_budget: 0.0 }
];

// LocalStorage Helper
const storage = {
    getCategories() {
        const raw = localStorage.getItem('expenseflow_categories');
        if (!raw) {
            localStorage.setItem('expenseflow_categories', JSON.stringify(DEFAULT_CATEGORIES));
            return DEFAULT_CATEGORIES;
        }
        try {
            return JSON.parse(raw);
        } catch {
            return DEFAULT_CATEGORIES;
        }
    },
    saveCategories(cats) {
        localStorage.setItem('expenseflow_categories', JSON.stringify(cats));
    },
    getTransactions() {
        const raw = localStorage.getItem('expenseflow_transactions');
        if (!raw) {
            // Seed a couple of initial sample transactions for the current month
            const curYm = new Date().toISOString().slice(0, 7);
            const initialTxs = [
                { id: 1, amount: 3500.0, type: "income", category_id: 8, date: `${curYm}-01`, payment_method: "Bank Transfer", note: "Monthly Salary" },
                { id: 2, amount: 1200.0, type: "expense", category_id: 2, date: `${curYm}-02`, payment_method: "Bank Transfer", note: "Apartment Rent" },
                { id: 3, amount: 85.50, type: "expense", category_id: 1, date: `${curYm}-03`, payment_method: "Card", note: "Weekly Grocery Store" },
                { id: 4, amount: 45.00, type: "expense", category_id: 4, date: `${curYm}-04`, payment_method: "Card", note: "Gas refill" },
                { id: 5, amount: 65.00, type: "expense", category_id: 3, date: `${curYm}-05`, payment_method: "UPI", note: "High-speed Internet" }
            ];
            localStorage.setItem('expenseflow_transactions', JSON.stringify(initialTxs));
            return initialTxs;
        }
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    },
    saveTransactions(txs) {
        localStorage.setItem('expenseflow_transactions', JSON.stringify(txs));
    }
};

// Unified Data API Layer (handles both FastAPI backend and LocalStorage)
const DataService = {
    async getCategories(type = null) {
        if (!isOfflineMode) {
            try {
                const res = await fetch(`/api/categories${type ? `?type=${type}` : ''}`);
                if (res.ok) return await res.json();
            } catch {
                isOfflineMode = true;
            }
        }
        let list = storage.getCategories();
        if (type) list = list.filter(c => c.type === type);
        return list;
    },

    async createCategory(catData) {
        if (!isOfflineMode) {
            try {
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(catData)
                });
                if (res.ok) return await res.json();
            } catch {
                isOfflineMode = true;
            }
        }
        const cats = storage.getCategories();
        if (cats.some(c => c.name.toLowerCase() === catData.name.toLowerCase())) {
            throw new Error("Category with this name already exists");
        }
        const newCat = { ...catData, id: Date.now() };
        cats.push(newCat);
        storage.saveCategories(cats);
        return newCat;
    },

    async updateCategory(id, updateData) {
        if (!isOfflineMode) {
            try {
                const res = await fetch(`/api/categories/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });
                if (res.ok) return await res.json();
            } catch {
                isOfflineMode = true;
            }
        }
        const cats = storage.getCategories();
        const idx = cats.findIndex(c => c.id === id);
        if (idx !== -1) {
            cats[idx] = { ...cats[idx], ...updateData };
            storage.saveCategories(cats);
            return cats[idx];
        }
        throw new Error("Category not found");
    },

    async deleteCategory(id) {
        if (!isOfflineMode) {
            try {
                const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
                if (res.ok) return true;
            } catch {
                isOfflineMode = true;
            }
        }
        let cats = storage.getCategories();
        cats = cats.filter(c => c.id !== id);
        storage.saveCategories(cats);
        // Also remove transactions belonging to this category
        let txs = storage.getTransactions();
        txs = txs.filter(t => t.category_id !== id);
        storage.saveTransactions(txs);
        return true;
    },

    async getTransactions(month = null, type = null, categoryId = null, search = null) {
        if (!isOfflineMode) {
            try {
                let url = `/api/transactions?limit=1000`;
                if (month) url += `&month=${month}`;
                if (type) url += `&type=${type}`;
                if (categoryId) url += `&category_id=${categoryId}`;
                if (search) url += `&search=${encodeURIComponent(search)}`;
                const res = await fetch(url);
                if (res.ok) return await res.json();
            } catch {
                isOfflineMode = true;
            }
        }
        const cats = storage.getCategories();
        const catMap = Object.fromEntries(cats.map(c => [c.id, c]));
        let list = storage.getTransactions().map(t => ({
            ...t,
            category: catMap[t.category_id] || { id: t.category_id, name: "Uncategorized", color: "#94a3b8" }
        }));

        if (month) list = list.filter(t => t.date.startsWith(month));
        if (type) list = list.filter(t => t.type === type);
        if (categoryId) list = list.filter(t => t.category_id == categoryId);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(t =>
                (t.note && t.note.toLowerCase().includes(q)) ||
                (t.payment_method && t.payment_method.toLowerCase().includes(q))
            );
        }
        return list.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    },

    async createTransaction(txData) {
        if (!isOfflineMode) {
            try {
                const res = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(txData)
                });
                if (res.ok) return await res.json();
            } catch {
                isOfflineMode = true;
            }
        }
        const txs = storage.getTransactions();
        const newTx = { ...txData, id: Date.now() };
        txs.unshift(newTx);
        storage.saveTransactions(txs);
        return newTx;
    },

    async updateTransaction(id, updateData) {
        if (!isOfflineMode) {
            try {
                const res = await fetch(`/api/transactions/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });
                if (res.ok) return await res.json();
            } catch {
                isOfflineMode = true;
            }
        }
        const txs = storage.getTransactions();
        const idx = txs.findIndex(t => t.id === id);
        if (idx !== -1) {
            txs[idx] = { ...txs[idx], ...updateData };
            storage.saveTransactions(txs);
            return txs[idx];
        }
        throw new Error("Transaction not found");
    },

    async deleteTransaction(id) {
        if (!isOfflineMode) {
            try {
                const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
                if (res.ok) return true;
            } catch {
                isOfflineMode = true;
            }
        }
        let txs = storage.getTransactions();
        txs = txs.filter(t => t.id !== id);
        storage.saveTransactions(txs);
        return true;
    },

    async getSummary(month) {
        if (!isOfflineMode) {
            try {
                const res = await fetch(`/api/analytics/summary?month=${month}`);
                if (res.ok) return await res.json();
            } catch {
                isOfflineMode = true;
            }
        }
        const txs = storage.getTransactions().filter(t => t.date.startsWith(month));
        const totalIncome = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        const netSavings = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 1000) / 10 : 0.0;

        return {
            month,
            total_income: Math.round(totalIncome * 100) / 100,
            total_expense: Math.round(totalExpense * 100) / 100,
            net_savings: Math.round(netSavings * 100) / 100,
            savings_rate: savingsRate,
            transaction_count: txs.length
        };
    },

    async getSpendingByCategory(month, type = 'expense') {
        if (!isOfflineMode) {
            try {
                const res = await fetch(`/api/analytics/by-category?month=${month}&type=${type}`);
                if (res.ok) return await res.json();
            } catch {
                isOfflineMode = true;
            }
        }
        const cats = storage.getCategories().filter(c => c.type === type);
        const txs = storage.getTransactions().filter(t => t.date.startsWith(month) && t.type === type);

        const results = cats.map(cat => {
            const spent = txs.filter(t => t.category_id === cat.id).reduce((sum, t) => sum + Number(t.amount), 0);
            const budget = cat.monthly_budget || 0.0;
            const usedPct = budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0.0;
            return {
                category_id: cat.id,
                category_name: cat.name,
                color: cat.color || "#3B82F6",
                icon: cat.icon || "tag",
                type: cat.type,
                total_spent: Math.round(spent * 100) / 100,
                monthly_budget: Math.round(budget * 100) / 100,
                budget_used_pct: usedPct
            };
        });

        return results.sort((a, b) => b.total_spent - a.total_spent);
    },

    async getMonthlyTrend(monthsCount = 6) {
        if (!isOfflineMode) {
            try {
                const res = await fetch(`/api/analytics/monthly-trend?months_count=${monthsCount}`);
                if (res.ok) return await res.json();
            } catch {
                isOfflineMode = true;
            }
        }
        const today = new Date();
        const targetMonths = [];
        for (let i = monthsCount - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            targetMonths.push(d.toISOString().slice(0, 7));
        }

        const txs = storage.getTransactions();
        return targetMonths.map(m => {
            const monthTxs = txs.filter(t => t.date.startsWith(m));
            const inc = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
            const exp = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
            return {
                month: m,
                income: Math.round(inc * 100) / 100,
                expense: Math.round(exp * 100) / 100,
                net: Math.round((inc - exp) * 100) / 100
            };
        });
    },

    async exportCSV(month) {
        if (!isOfflineMode) {
            window.location.href = `/api/transactions/export?month=${month}`;
            return;
        }
        // Client-side CSV generation
        const txs = await this.getTransactions(month);
        let csv = "ID,Date,Type,Category,Amount,Payment Method,Note\n";
        txs.forEach(t => {
            const catName = t.category ? t.category.name : "Uncategorized";
            csv += `"${t.id}","${t.date}","${t.type}","${catName}","${t.amount}","${t.payment_method || ''}","${(t.note || '').replace(/"/g, '""')}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `transactions_${month || 'all'}.csv`;
        link.click();
    }
};

// Application State
let currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
let currentCurrency = localStorage.getItem('expenseflow_currency') || '₹';
let categories = [];
let transactions = [];
let categoryChartInstance = null;
let trendChartInstance = null;

// DOM Elements
const monthPicker = document.getElementById('monthPicker');
const currencyBtns = document.querySelectorAll('.currency-btn');
const statNetSavings = document.getElementById('statNetSavings');
const statSavingsRate = document.getElementById('statSavingsRate');
const statIncome = document.getElementById('statIncome');
const statExpenses = document.getElementById('statExpenses');
const statTxCount = document.getElementById('statTxCount');
const budgetProgressList = document.getElementById('budgetProgressList');
const transactionsTableBody = document.getElementById('transactionsTableBody');
const noTransactionsState = document.getElementById('noTransactionsState');
const filterType = document.getElementById('filterType');
const filterCategory = document.getElementById('filterCategory');
const searchInput = document.getElementById('searchInput');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Modals
const txModal = document.getElementById('txModal');
const txModalTitle = document.getElementById('txModalTitle');
const txForm = document.getElementById('txForm');
const openAddTxModalBtn = document.getElementById('openAddTxModal');
const typeExpenseBtn = document.getElementById('typeExpenseBtn');
const typeIncomeBtn = document.getElementById('typeIncomeBtn');
const txTypeInput = document.getElementById('txType');
const txCategorySelect = document.getElementById('txCategory');
const formCurrencyPrefix = document.getElementById('formCurrencyPrefix');

const catModal = document.getElementById('catModal');
const openCategoriesBtn = document.getElementById('openCategoriesBtn');
const newCatForm = document.getElementById('newCatForm');
const categoriesManageList = document.getElementById('categoriesManageList');

// Toast
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    monthPicker.value = currentMonth;
    updateCurrencyButtons();
    formCurrencyPrefix.textContent = currentCurrency;

    // Show storage badge
    updateStorageBadge();

    // Event Listeners
    monthPicker.addEventListener('change', (e) => {
        currentMonth = e.target.value;
        loadAllData();
    });

    currencyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentCurrency = btn.getAttribute('data-currency');
            localStorage.setItem('expenseflow_currency', currentCurrency);
            updateCurrencyButtons();
            formCurrencyPrefix.textContent = currentCurrency;
            renderAll();
        });
    });

    // Transaction Type Tabs
    typeExpenseBtn.addEventListener('click', () => setTxType('expense'));
    typeIncomeBtn.addEventListener('click', () => setTxType('income'));

    // Modal triggers
    openAddTxModalBtn.addEventListener('click', () => openTxModal());
    document.querySelectorAll('.close-modal').forEach(b => b.addEventListener('click', () => txModal.classList.add('hidden')));

    openCategoriesBtn.addEventListener('click', () => openCategoryModal());
    document.querySelectorAll('.close-cat-modal').forEach(b => b.addEventListener('click', () => catModal.classList.add('hidden')));

    // Form Submissions
    txForm.addEventListener('submit', handleTxSubmit);
    newCatForm.addEventListener('submit', handleNewCategorySubmit);

    // Filter Listeners
    filterType.addEventListener('change', loadTransactions);
    filterCategory.addEventListener('change', loadTransactions);
    searchInput.addEventListener('input', debounce(loadTransactions, 300));

    // Export CSV
    exportCsvBtn.addEventListener('click', () => {
        DataService.exportCSV(currentMonth);
    });

    // Initial Data Fetch
    await loadCategories();
    await loadAllData();
    lucide.createIcons();
});

// Update Storage Indicator Badge
function updateStorageBadge() {
    const badgeContainer = document.getElementById('storageBadge');
    if (badgeContainer) {
        if (isOfflineMode) {
            badgeContainer.innerHTML = `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" title="All data is saved securely in your browser's LocalStorage">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Local Browser Mode
                </span>
            `;
        } else {
            badgeContainer.innerHTML = `
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200" title="Connected to FastAPI backend">
                    <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                    FastAPI Server
                </span>
            `;
        }
    }
}

// Format Currency
function fmt(amount) {
    const val = Number(amount) || 0;
    return `${currentCurrency}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function updateCurrencyButtons() {
    currencyBtns.forEach(btn => {
        if (btn.getAttribute('data-currency') === currentCurrency) {
            btn.className = 'currency-btn px-2.5 py-1 rounded-md transition-all bg-white text-slate-900 shadow-sm font-bold';
        } else {
            btn.className = 'currency-btn px-2.5 py-1 rounded-md transition-all text-slate-600 hover:text-slate-900 font-medium';
        }
    });
}

// Set Transaction Type in Modal
function setTxType(type) {
    txTypeInput.value = type;
    if (type === 'expense') {
        typeExpenseBtn.className = 'py-2 text-sm font-semibold rounded-lg transition-all bg-white text-rose-600 shadow-xs';
        typeIncomeBtn.className = 'py-2 text-sm font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900';
    } else {
        typeIncomeBtn.className = 'py-2 text-sm font-semibold rounded-lg transition-all bg-white text-emerald-600 shadow-xs';
        typeExpenseBtn.className = 'py-2 text-sm font-semibold rounded-lg transition-all text-slate-600 hover:text-slate-900';
    }
    populateModalCategories(type);
}

// Fetch Categories
async function loadCategories() {
    try {
        categories = await DataService.getCategories();
        populateFilterCategories();
    } catch (err) {
        console.error(err);
        showToast('Error loading categories', true);
    }
}

function populateFilterCategories() {
    const prevVal = filterCategory.value;
    filterCategory.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.type})`;
        filterCategory.appendChild(opt);
    });
    filterCategory.value = prevVal;
}

function populateModalCategories(type, selectedId = null) {
    txCategorySelect.innerHTML = '';
    const filtered = categories.filter(c => c.type === type);
    
    if (filtered.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No categories found. Create one first!';
        txCategorySelect.appendChild(opt);
        return;
    }

    filtered.forEach((c, idx) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (selectedId) {
            if (c.id == selectedId) opt.selected = true;
        } else if (idx === 0) {
            opt.selected = true;
        }
        txCategorySelect.appendChild(opt);
    });
}

// Load All Month Data
async function loadAllData() {
    await Promise.all([
        loadSummary(),
        loadCategorySpending(),
        loadTransactions(),
        loadTrend()
    ]);
    lucide.createIcons();
}

// Load Summary
async function loadSummary() {
    try {
        const data = await DataService.getSummary(currentMonth);

        statNetSavings.textContent = fmt(data.net_savings);
        statNetSavings.className = `text-2xl font-extrabold mt-1 ${data.net_savings >= 0 ? 'text-slate-900' : 'text-rose-600'}`;
        statSavingsRate.textContent = `Savings rate: ${data.savings_rate}%`;

        statIncome.textContent = fmt(data.total_income);
        statExpenses.textContent = fmt(data.total_expense);
        statTxCount.textContent = data.transaction_count;
    } catch (err) {
        console.error(err);
    }
}

// Load Spending By Category & Budgets
async function loadCategorySpending() {
    try {
        const data = await DataService.getSpendingByCategory(currentMonth, 'expense');
        renderCategoryChart(data);
        renderBudgetProgress(data);
    } catch (err) {
        console.error(err);
    }
}

// Render Doughnut Chart
function renderCategoryChart(data) {
    const canvas = document.getElementById('categoryChart');
    const noDataElem = document.getElementById('noChartData');
    const spentData = data.filter(d => d.total_spent > 0);

    if (spentData.length === 0) {
        canvas.classList.add('hidden');
        noDataElem.classList.remove('hidden');
        if (categoryChartInstance) categoryChartInstance.destroy();
        return;
    }

    canvas.classList.remove('hidden');
    noDataElem.classList.add('hidden');

    const labels = spentData.map(d => d.category_name);
    const amounts = spentData.map(d => d.total_spent);
    const colors = spentData.map(d => d.color);

    if (categoryChartInstance) categoryChartInstance.destroy();

    categoryChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: amounts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 11, family: 'sans-serif' } }
                },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            return ` ${ctx.label}: ${fmt(ctx.raw)}`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// Render Budget Progress
function renderBudgetProgress(data) {
    budgetProgressList.innerHTML = '';
    const budgeted = data.filter(d => d.monthly_budget > 0);

    if (budgeted.length === 0) {
        budgetProgressList.innerHTML = `
            <div class="text-center py-8 text-slate-400 text-xs">
                <i data-lucide="target" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                No monthly budgets set yet.<br>Click "Manage +" above to set spending limits.
            </div>
        `;
        lucide.createIcons();
        return;
    }

    budgeted.forEach(item => {
        const pct = item.budget_used_pct;
        let barColor = 'bg-emerald-500';
        let badgeColor = 'bg-emerald-50 text-emerald-700';

        if (pct >= 100) {
            barColor = 'bg-rose-500 animate-pulse';
            badgeColor = 'bg-rose-50 text-rose-700';
        } else if (pct >= 80) {
            barColor = 'bg-amber-500';
            badgeColor = 'bg-amber-50 text-amber-700';
        }

        const div = document.createElement('div');
        div.className = 'space-y-1.5';
        div.innerHTML = `
            <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-slate-700 flex items-center gap-1.5">
                    <span class="color-dot" style="background-color: ${item.color}"></span>
                    ${item.category_name}
                </span>
                <span class="text-slate-500 font-medium">
                    ${fmt(item.total_spent)} <span class="text-slate-400">/ ${fmt(item.monthly_budget)}</span>
                    <span class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeColor}">${pct}%</span>
                </span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div class="${barColor} h-2 rounded-full transition-all duration-500" style="width: ${Math.min(pct, 100)}%"></div>
            </div>
        `;
        budgetProgressList.appendChild(div);
    });
}

// Render 6-Month Trend Chart
async function loadTrend() {
    try {
        const data = await DataService.getMonthlyTrend(6);

        const labels = data.map(d => {
            const parts = d.month.split('-');
            const date = new Date(parts[0], parts[1] - 1);
            return date.toLocaleString('default', { month: 'short' });
        });
        const incomes = data.map(d => d.income);
        const expenses = data.map(d => d.expense);

        const canvas = document.getElementById('trendChart');
        if (trendChartInstance) trendChartInstance.destroy();

        trendChartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Income',
                        data: incomes,
                        backgroundColor: '#10B981',
                        borderRadius: 6
                    },
                    {
                        label: 'Expense',
                        data: expenses,
                        backgroundColor: '#F43F5E',
                        borderRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => `${currentCurrency}${value}`
                        }
                    }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}`
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error(err);
    }
}

// Load Transactions Table
async function loadTransactions() {
    const type = filterType.value;
    const catId = filterCategory.value;
    const q = searchInput.value.trim();

    try {
        transactions = await DataService.getTransactions(currentMonth, type, catId, q);
        renderTransactionsTable();
    } catch (err) {
        showToast('Error loading transactions', true);
    }
}

function renderTransactionsTable() {
    transactionsTableBody.innerHTML = '';

    if (transactions.length === 0) {
        noTransactionsState.classList.remove('hidden');
        return;
    }

    noTransactionsState.classList.add('hidden');

    transactions.forEach(tx => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50/80 transition-colors';

        const isExpense = tx.type === 'expense';
        const sign = isExpense ? '-' : '+';
        const amountClass = isExpense ? 'text-rose-600' : 'text-emerald-600';
        const categoryName = tx.category ? tx.category.name : 'Uncategorized';
        const categoryColor = tx.category ? tx.category.color : '#94a3b8';

        tr.innerHTML = `
            <td class="py-3.5 px-6 whitespace-nowrap text-xs font-semibold text-slate-500">${tx.date}</td>
            <td class="py-3.5 px-6 whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style="background-color: ${categoryColor}15; color: ${categoryColor}">
                    <span class="color-dot" style="background-color: ${categoryColor}"></span>
                    ${categoryName}
                </span>
            </td>
            <td class="py-3.5 px-6 text-slate-800 font-medium max-w-xs truncate">${tx.note || '<span class="text-slate-300 italic">No notes</span>'}</td>
            <td class="py-3.5 px-6 whitespace-nowrap text-xs text-slate-500">
                <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">${tx.payment_method}</span>
            </td>
            <td class="py-3.5 px-6 whitespace-nowrap text-right font-bold ${amountClass}">
                ${sign}${fmt(tx.amount)}
            </td>
            <td class="py-3.5 px-6 whitespace-nowrap text-center space-x-2">
                <button onclick="editTransaction(${tx.id})" title="Edit" class="text-slate-400 hover:text-indigo-600 transition-colors">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button onclick="deleteTransaction(${tx.id})" title="Delete" class="text-slate-400 hover:text-rose-600 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        transactionsTableBody.appendChild(tr);
    });

    lucide.createIcons();
}

// Modal Handlers
function openTxModal(tx = null) {
    if (tx) {
        txModalTitle.textContent = 'Edit Transaction';
        document.getElementById('txId').value = tx.id;
        document.getElementById('txAmount').value = tx.amount;
        document.getElementById('txDate').value = tx.date;
        document.getElementById('txMethod').value = tx.payment_method;
        document.getElementById('txNote').value = tx.note || '';
        setTxType(tx.type);
        populateModalCategories(tx.type, tx.category_id);
    } else {
        txModalTitle.textContent = 'Add Transaction';
        txForm.reset();
        document.getElementById('txId').value = '';
        document.getElementById('txDate').value = new Date().toISOString().slice(0, 10);
        setTxType('expense');
    }
    txModal.classList.remove('hidden');
}

window.editTransaction = function (id) {
    const tx = transactions.find(t => t.id === id);
    if (tx) openTxModal(tx);
};

window.deleteTransaction = async function (id) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
        await DataService.deleteTransaction(id);
        showToast('Transaction deleted');
        loadAllData();
    } catch (err) {
        showToast('Error deleting transaction', true);
    }
};

async function handleTxSubmit(e) {
    e.preventDefault();
    const txId = document.getElementById('txId').value;
    const catVal = document.getElementById('txCategory').value;

    if (!catVal) {
        showToast('Please select a valid category', true);
        return;
    }

    const payload = {
        amount: parseFloat(document.getElementById('txAmount').value),
        type: txTypeInput.value,
        date: document.getElementById('txDate').value,
        category_id: parseInt(catVal),
        payment_method: document.getElementById('txMethod').value,
        note: document.getElementById('txNote').value.trim()
    };

    const isEdit = !!txId;

    try {
        if (isEdit) {
            await DataService.updateTransaction(parseInt(txId), payload);
            showToast('Transaction updated!');
        } else {
            await DataService.createTransaction(payload);
            showToast('Transaction added!');
        }

        txModal.classList.add('hidden');

        // Update month picker if tx date belongs to different month
        const txMonth = payload.date.slice(0, 7);
        if (txMonth !== currentMonth) {
            currentMonth = txMonth;
            monthPicker.value = currentMonth;
        }
        loadAllData();
    } catch (err) {
        showToast(err.message || 'Error saving transaction', true);
    }
}

// Category Management Modal
function openCategoryModal() {
    renderCategoryManageList();
    catModal.classList.remove('hidden');
}

function renderCategoryManageList() {
    categoriesManageList.innerHTML = '';
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors';
        div.innerHTML = `
            <div class="flex items-center space-x-3">
                <span class="color-dot" style="background-color: ${cat.color}"></span>
                <div>
                    <h5 class="text-sm font-semibold text-slate-800">${cat.name}</h5>
                    <span class="text-[10px] uppercase font-bold text-slate-400">${cat.type}</span>
                </div>
            </div>
            <div class="flex items-center space-x-2">
                <div class="relative w-28">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">${currentCurrency}</span>
                    <input type="number" min="0" step="10" value="${cat.monthly_budget || 0}" 
                        onchange="updateCategoryBudget(${cat.id}, this.value)" 
                        title="Monthly Budget" 
                        class="w-full pl-5 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-indigo-500">
                </div>
                <button onclick="deleteCategory(${cat.id})" title="Delete Category" class="p-1.5 text-slate-400 hover:text-rose-600 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        categoriesManageList.appendChild(div);
    });
    lucide.createIcons();
}

window.updateCategoryBudget = async function (id, budgetVal) {
    try {
        await DataService.updateCategory(id, { monthly_budget: parseFloat(budgetVal) || 0.0 });
        showToast('Budget updated');
        await loadCategories();
        loadCategorySpending();
    } catch (err) {
        showToast('Error updating budget', true);
    }
};

window.deleteCategory = async function (id) {
    if (!confirm('Deleting this category will also remove its associated transactions. Continue?')) return;
    try {
        await DataService.deleteCategory(id);
        showToast('Category deleted');
        await loadCategories();
        renderCategoryManageList();
        loadAllData();
    } catch (err) {
        showToast('Error deleting category', true);
    }
};

async function handleNewCategorySubmit(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('newCatName').value.trim(),
        type: document.getElementById('newCatType').value,
        color: document.getElementById('newCatColor').value,
        monthly_budget: parseFloat(document.getElementById('newCatBudget').value) || 0.0,
        icon: 'tag'
    };

    try {
        await DataService.createCategory(payload);
        newCatForm.reset();
        showToast('Category created!');
        await loadCategories();
        renderCategoryManageList();
        loadAllData();
    } catch (err) {
        showToast(err.message || 'Could not create category', true);
    }
}

// Re-render helper when currency changes
function renderAll() {
    loadSummary();
    loadCategorySpending();
    renderTransactionsTable();
    loadTrend();
}

// Toast helper
function showToast(message, isError = false) {
    toastMsg.textContent = message;
    toast.className = `fixed bottom-5 right-5 z-50 transform transition-all duration-300 px-4 py-3 rounded-xl shadow-lg font-medium text-sm text-white flex items-center space-x-2 ${isError ? 'bg-rose-600' : 'bg-slate-900'}`;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
    }, 2800);
}

// Utility: Debounce
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
