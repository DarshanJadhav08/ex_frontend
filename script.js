const API = "https://expense-backend-5-u5kf.onrender.com";
// const API = "http://localhost:3000";

// Current user data
let currentUser = null;
let userTransactions = [];
let userStats = {
    totalAdded: 0,
    totalSpent: 0,
    totalTransactions: 0,
    currentBalance: 0,
    avgExpense: 0
};

// Database class for localStorage
class ExpenseDB {
    constructor() {
        this.dbName = 'expenseManagerDB';
        this.init();
    }
    
    init() {
        if (!localStorage.getItem(this.dbName)) {
            localStorage.setItem(this.dbName, JSON.stringify({
                users: {},
                transactions: {},
                lastUserId: 0,
                lastTransactionId: 0
            }));
        }
    }
    
    // User methods
    createUser(firstName, lastName, password, initialAmount) {
        const db = this.getDB();
        const userId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
        
        if (db.users[userId]) {
            return { success: false, error: 'User already exists' };
        }
        
        const user = {
            id: userId,
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`,
            password: password,
            initialAmount: parseFloat(initialAmount),
            currentBalance: parseFloat(initialAmount),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        db.users[userId] = user;
        db.lastUserId++;
        this.saveDB(db);
        
        // Create initial transaction
        this.addTransaction(userId, {
            id: Date.now(),
            type: 'credit',
            amount: parseFloat(initialAmount),
            description: 'Initial Amount',
            category: 'Initial',
            date: this.getCurrentDate(),
            time: this.getCurrentTime(),
            isInitial: true
        });
        
        return { success: true, data: user };
    }
    
    authenticateUser(firstName, lastName, password) {
        const userId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
        const db = this.getDB();
        const user = db.users[userId];
        
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        
        if (user.password !== password) {
            return { success: false, error: 'Invalid password' };
        }
        
        // Update last login
        user.lastLogin = new Date().toISOString();
        db.users[userId] = user;
        this.saveDB(db);
        
        return { success: true, data: user };
    }
    
    getUser(userId) {
        const db = this.getDB();
        return db.users[userId] || null;
    }
    
    updateUserBalance(userId, amount) {
        const db = this.getDB();
        const user = db.users[userId];
        
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        
        user.currentBalance += parseFloat(amount);
        db.users[userId] = user;
        this.saveDB(db);
        
        return { success: true, data: user };
    }
    
    // Transaction methods
    addTransaction(userId, transaction) {
        const db = this.getDB();
        
        if (!db.transactions[userId]) {
            db.transactions[userId] = [];
        }
        
        // Add transaction to beginning of array
        db.transactions[userId].unshift(transaction);
        db.lastTransactionId++;
        this.saveDB(db);
        
        return { success: true, data: transaction };
    }
    
    getUserTransactions(userId) {
        const db = this.getDB();
        return db.transactions[userId] || [];
    }
    
    getFilteredTransactions(userId, filters = {}) {
        let transactions = this.getUserTransactions(userId);
        
        // Filter by type
        if (filters.type && filters.type !== 'all') {
            transactions = transactions.filter(t => t.type === filters.type);
        }
        
        // Filter by period
        if (filters.period && filters.period !== 'all') {
            const today = new Date();
            let startDate = new Date();
            
            switch(filters.period) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    transactions = transactions.filter(t => {
                        const transDate = this.parseDate(t.date);
                        return transDate >= startDate;
                    });
                    break;
                case 'week':
                    startDate.setDate(today.getDate() - 7);
                    transactions = transactions.filter(t => {
                        const transDate = this.parseDate(t.date);
                        return transDate >= startDate;
                    });
                    break;
                case 'month':
                    startDate.setMonth(today.getMonth() - 1);
                    transactions = transactions.filter(t => {
                        const transDate = this.parseDate(t.date);
                        return transDate >= startDate;
                    });
                    break;
                case 'year':
                    startDate.setFullYear(today.getFullYear() - 1);
                    transactions = transactions.filter(t => {
                        const transDate = this.parseDate(t.date);
                        return transDate >= startDate;
                    });
                    break;
                case 'custom':
                    if (filters.startDate && filters.endDate) {
                        const start = new Date(filters.startDate);
                        const end = new Date(filters.endDate);
                        end.setHours(23, 59, 59, 999);
                        
                        transactions = transactions.filter(t => {
                            const transDate = this.parseDate(t.date);
                            return transDate >= start && transDate <= end;
                        });
                    }
                    break;
            }
        }
        
        return transactions;
    }
    
    // Helper methods
    getDB() {
        return JSON.parse(localStorage.getItem(this.dbName));
    }
    
    saveDB(data) {
        localStorage.setItem(this.dbName, JSON.stringify(data));
    }
    
    getCurrentDate() {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        return `${day}-${month}-${year}`;
    }
    
    getCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    parseDate(dateStr) {
        if (!dateStr) return new Date();
        
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return new Date(parts[0], parts[1] - 1, parts[2]);
                } else {
                    return new Date(parts[2], parts[1] - 1, parts[0]);
                }
            }
        }
        
        const parsed = new Date(dateStr);
        if (!isNaN(parsed)) return parsed;
        
        return new Date();
    }
}

// Initialize database
const expenseDB = new ExpenseDB();

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            if (currentUser && currentUser.id) {
                const dbUser = expenseDB.getUser(currentUser.id);
                if (dbUser) {
                    showDashboard();
                    loadUserData();
                    showNotification(`Welcome back, ${currentUser.firstName}!`, 'success');
                } else {
                    showLogin();
                }
            } else {
                showLogin();
            }
        } catch (e) {
            showLogin();
        }
    } else {
        showLogin();
    }
    
    // Set up Enter key listeners
    setupEnterKeyListeners();
    setupCustomDateRange();
    
    // Add PDF button click listener
    const pdfBtn = document.getElementById('download-report-btn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', downloadPDFReport);
    }
});

// Set up Enter key listeners for forms
function setupEnterKeyListeners() {
    // Login form
    const loginInputs = ['login-firstname', 'login-lastname', 'login-password'];
    loginInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') login();
            });
        }
    });
    
    // Register form
    const regInputs = ['reg-firstname', 'reg-lastname', 'reg-password', 'reg-confirm-password', 'reg-amount'];
    regInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') register();
            });
        }
    });
}

// Setup custom date range functionality
function setupCustomDateRange() {
    const periodSelect = document.getElementById('report-period');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            const customRangeDiv = document.getElementById('custom-date-range');
            if (this.value === 'custom') {
                customRangeDiv.classList.add('show');
                
                // Set default dates (last 30 days)
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                
                document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
                document.getElementById('end-date').value = endDate.toISOString().split('T')[0];
            } else {
                customRangeDiv.classList.remove('show');
            }
        });
    }
    
    // Set today's date as default for end date
    const today = new Date().toISOString().split('T')[0];
    const endDateInput = document.getElementById('end-date');
    if (endDateInput) {
        endDateInput.value = today;
        endDateInput.max = today;
    }
    
    // Set start date max to today
    const startDateInput = document.getElementById('start-date');
    if (startDateInput) {
        startDateInput.max = today;
    }
}

// ===============================
// NOTIFICATION SYSTEM
// ===============================
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    // Add close functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Add slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===============================
// PAGE NAVIGATION
// ===============================
function showLogin() {
    document.getElementById('register-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.remove('active');
    document.getElementById('login-section').classList.add('active');
    
    // Clear forms
    document.getElementById('login-firstname').value = '';
    document.getElementById('login-lastname').value = '';
    document.getElementById('login-password').value = '';
}

function showRegister() {
    document.getElementById('login-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.remove('active');
    document.getElementById('register-section').classList.add('active');
    
    // Clear form
    document.getElementById('reg-firstname').value = '';
    document.getElementById('reg-lastname').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-confirm-password').value = '';
    document.getElementById('reg-amount').value = '';
}

function showDashboard() {
    document.getElementById('login-section').classList.remove('active');
    document.getElementById('register-section').classList.remove('active');
    document.getElementById('dashboard-section').classList.add('active');
    
    // Update user info
    if (currentUser) {
        document.getElementById('welcome-user').textContent = currentUser.firstName;
        document.getElementById('user-fullname').textContent = currentUser.fullName;
        document.getElementById('user-avatar').textContent = currentUser.firstName.charAt(0);
        document.getElementById('user-email').textContent = `${currentUser.firstName.toLowerCase()}.${currentUser.lastName.toLowerCase()}@expensemanager.com`;
    }
}

// ===============================
// AUTHENTICATION
// ===============================
async function login() {
    const firstName = document.getElementById('login-firstname').value.trim();
    const lastName = document.getElementById('login-lastname').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!firstName || !lastName || !password) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }
    
    try {
        // First try local database
        const result = expenseDB.authenticateUser(firstName, lastName, password);
        
        if (result.success) {
            const user = result.data;
            
            currentUser = {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                initialAmount: user.initialAmount,
                currentBalance: user.currentBalance,
                joinDate: user.createdAt
            };
            
            // Save to localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Show dashboard
            showDashboard();
            loadUserData();
            
            showNotification(`Welcome back, ${currentUser.firstName}!`, 'success');
            return;
        }
        
        // If not found in local DB, try API
        const response = await fetch(`${API}/users`);
        const apiResult = await response.json();
        
        if (apiResult.success && apiResult.data) {
            const apiUser = apiResult.data.find(u => 
                u.First_Name.toLowerCase() === firstName.toLowerCase() && 
                u.Last_Name.toLowerCase() === lastName.toLowerCase()
            );
            
            if (apiUser) {
                if (password.length < 6) {
                    showNotification('Password must be at least 6 characters', 'warning');
                    return;
                }
                
                // Create user in local database
                const newUser = expenseDB.createUser(
                    firstName, 
                    lastName, 
                    password, 
                    apiUser.Total_Amount || 0
                );
                
                if (newUser.success) {
                    currentUser = {
                        id: newUser.data.id,
                        firstName: newUser.data.firstName,
                        lastName: newUser.data.lastName,
                        fullName: newUser.data.fullName,
                        initialAmount: newUser.data.initialAmount,
                        currentBalance: newUser.data.currentBalance,
                        joinDate: newUser.data.createdAt
                    };
                    
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    showDashboard();
                    loadUserData();
                    showNotification(`Welcome back, ${currentUser.firstName}!`, 'success');
                }
            } else {
                showNotification('User not found. Please check your name or register.', 'error');
            }
        } else {
            showNotification('Unable to connect to server', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Connection error. Please try again.', 'error');
    }
}

// ===============================
// REGISTRATION - OPTIMIZED (FASTER)
// ===============================
async function register() {
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName = document.getElementById('reg-lastname').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const amount = document.getElementById('reg-amount').value;
    const agreeTerms = document.getElementById('agree-terms').checked;
    
    // Validation
    if (!firstName || !lastName || !password || !confirmPassword || !amount) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'warning');
        return;
    }
    
    if (amount <= 0) {
        showNotification('Please enter a valid initial amount', 'warning');
        return;
    }
    
    if (!agreeTerms) {
        showNotification('Please agree to the terms and conditions', 'warning');
        return;
    }
    
    // Show loading state
    const registerBtn = document.querySelector('.register-form .btn-success');
    const originalText = registerBtn.innerHTML;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Creating Account...</span>';
    registerBtn.disabled = true;
    
    try {
        const amountNum = parseFloat(amount);
        const userId = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;
        
        // Check if user already exists in local database
        const existingUser = expenseDB.getUser(userId);
        if (existingUser) {
            showNotification('User already exists. Please login instead.', 'error');
            registerBtn.innerHTML = originalText;
            registerBtn.disabled = false;
            return;
        }
        
        // Try API registration in background (non-blocking)
        let apiId = null;
        const apiPromise = (async () => {
            try {
                const today = new Date();
                const day = String(today.getDate()).padStart(2, '0');
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const year = today.getFullYear();
                
                const body = {
                    First_Name: firstName,
                    Last_Name: lastName,
                    Total_Amount: amountNum,
                    Date: `${day}-${month}-${year}`,
                    Month: month,
                    Year: year
                };

                const res = await fetch(`${API}/user`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });

                const result = await res.json();
                if (result.success) {
                    apiId = result.data.id;
                }
            } catch (error) {
                console.log('API registration failed, using local only');
            }
        })();

        // Create user immediately in local database (FAST)
        const dbResult = expenseDB.createUser(firstName, lastName, password, amountNum);
        
        if (dbResult.success) {
            const user = dbResult.data;
            
            currentUser = {
                id: user.id,
                apiId: apiId,
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                initialAmount: user.initialAmount,
                currentBalance: user.currentBalance,
                joinDate: user.createdAt
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Show success and go to dashboard IMMEDIATELY
            showNotification('Account created successfully!', 'success');
            
            // Go to dashboard without waiting for API
            showDashboard();
            
            // Load data in background
            setTimeout(() => {
                loadUserData();
            }, 100);
            
        } else {
            showNotification(dbResult.error || 'Registration failed', 'error');
            registerBtn.innerHTML = originalText;
            registerBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please check your connection.', 'error');
        registerBtn.innerHTML = originalText;
        registerBtn.disabled = false;
    }
}

function logout() {
    currentUser = null;
    userTransactions = [];
    userStats = {
        totalAdded: 0,
        totalSpent: 0,
        totalTransactions: 0,
        currentBalance: 0,
        avgExpense: 0
    };
    localStorage.removeItem('currentUser');
    showNotification('Logged out successfully', 'success');
    showLogin();
}

// ===============================
// LOAD USER DATA
// ===============================
async function loadUserData() {
    if (!currentUser || !currentUser.id) {
        showNotification('Please login first', 'warning');
        return;
    }
    
    try {
        // Show loading state
        document.getElementById('transactions-list').innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading transactions...</span>
            </div>
        `;
        
        // Get user from database
        const dbUser = expenseDB.getUser(currentUser.id);
        if (!dbUser) {
            showNotification('User not found. Please login again.', 'error');
            logout();
            return;
        }
        
        // Update current user with latest data
        currentUser.currentBalance = dbUser.currentBalance;
        currentUser.initialAmount = dbUser.initialAmount;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Get transactions from database
        userTransactions = expenseDB.getUserTransactions(currentUser.id);
        
        // Calculate totals CORRECTLY (no double counting)
        calculateUserStats();
        
        // Update UI with stats
        updateStatsUI();
        
        // Update transaction list
        updateTransactionList();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Error loading data. Please try again.', 'error');
        document.getElementById('transactions-list').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error Loading Data</h4>
                <p>Please check your connection and try again</p>
            </div>
        `;
    }
}

// ===============================
// CALCULATE USER STATS
// ===============================
function calculateUserStats() {
    let totalAdded = 0;
    let totalSpent = 0;
    let totalTransactions = userTransactions.length;
    
    // Calculate ONLY from transactions (not including initial amount separately)
    userTransactions.forEach(transaction => {
        if (transaction.type === 'credit') {
            totalAdded += transaction.amount || 0;
        } else if (transaction.type === 'debit') {
            totalSpent += transaction.amount || 0;
        }
    });
    
    // Current balance should be from user data
    const currentBalance = currentUser.currentBalance || 0;
    
    // For average expense, consider only debit transactions
    const debitTransactions = userTransactions.filter(t => t.type === 'debit');
    const avgExpense = debitTransactions.length > 0 ? 
        (totalSpent / debitTransactions.length) : 0;
    
    userStats = {
        totalAdded: totalAdded,
        totalSpent: totalSpent,
        totalTransactions: totalTransactions,
        currentBalance: currentBalance,
        avgExpense: avgExpense
    };
}

// ===============================
// UPDATE STATS UI
// ===============================
function updateStatsUI() {
    document.getElementById('current-balance').textContent = `$${formatNumber(userStats.currentBalance)}`;
    document.getElementById('total-added').textContent = `$${formatNumber(userStats.totalAdded)}`;
    document.getElementById('total-spent').textContent = `$${formatNumber(userStats.totalSpent)}`;
    document.getElementById('total-transactions').textContent = userStats.totalTransactions;
    document.getElementById('avg-expense').textContent = `$${formatNumber(userStats.avgExpense)}`;
}

// ===============================
// ADD MONEY
// ===============================
async function addMoney() {
    if (!currentUser) {
        showNotification('Please login first', 'warning');
        return;
    }
    
    const amount = document.getElementById('add-amount').value;
    const description = document.getElementById('add-description').value || 'Money Added';
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'warning');
        return;
    }
    
    try {
        const amountNum = parseFloat(amount);
        
        // Add money to local database
        const newTransaction = {
            id: Date.now(),
            type: 'credit',
            amount: amountNum,
            description: description,
            category: 'Income',
            date: getCurrentDate(),
            time: getCurrentTime()
        };
        
        // Save to local database
        expenseDB.addTransaction(currentUser.id, newTransaction);
        expenseDB.updateUserBalance(currentUser.id, amountNum);
        
        // Try to sync with API if user has API ID
        if (currentUser.apiId) {
            try {
                await fetch(`${API}/add-money-by-name`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        first_name: currentUser.firstName,
                        last_name: currentUser.lastName,
                        add_amount: amountNum
                    })
                });
            } catch (apiError) {
                console.log('API sync failed, using local data');
            }
        }
        
        // Reload data
        loadUserData();
        
        // Clear form
        document.getElementById('add-amount').value = '';
        document.getElementById('add-description').value = '';
        
        showNotification(`Successfully added $${amount} to your account`, 'success');
        
    } catch (err) {
        console.error(err);
        showNotification('Error adding money', 'error');
    }
}

// ===============================
// ADD EXPENSE
// ===============================
async function addExpense() {
    if (!currentUser) {
        showNotification('Please login first', 'warning');
        return;
    }
    
    const amount = document.getElementById('expense-amount').value;
    const category = document.getElementById('expense-category').value;
    const description = document.getElementById('expense-description').value;
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'warning');
        return;
    }
    
    if (!category) {
        showNotification('Please select a category', 'warning');
        return;
    }
    
    if (!description) {
        showNotification('Please enter a description', 'warning');
        return;
    }

    try {
        const amountNum = parseFloat(amount);
        
        // Check if user has enough balance
        const dbUser = expenseDB.getUser(currentUser.id);
        if (dbUser.currentBalance < amountNum) {
            showNotification('Insufficient balance!', 'error');
            return;
        }
        
        // Add expense to local database
        const newTransaction = {
            id: Date.now(),
            type: 'debit',
            amount: amountNum,
            description: description,
            category: category,
            date: getCurrentDate(),
            time: getCurrentTime()
        };
        
        // Save to local database
        expenseDB.addTransaction(currentUser.id, newTransaction);
        expenseDB.updateUserBalance(currentUser.id, -amountNum);
        
        // Try to sync with API if user has API ID
        if (currentUser.apiId) {
            try {
                await fetch(`${API}/user/${currentUser.apiId}/expense`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        expense: amountNum,
                        category: category,
                        description: description
                    })
                });
            } catch (apiError) {
                console.log('API sync failed, using local data');
            }
        }
        
        // Reload data
        loadUserData();
        
        // Clear form
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-category').value = '';
        document.getElementById('expense-description').value = '';
        
        showNotification(`Expense of $${amount} added successfully`, 'success');
        
    } catch (err) {
        console.error(err);
        showNotification('Error adding expense', 'error');
    }
}

// Helper functions for dates
function getCurrentDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
}

function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// ===============================
// GENERATE REPORT - IMPROVED (SHOWS REPORT IMMEDIATELY)
// ===============================
function generateReport() {
    if (!currentUser) {
        showNotification('Please login first', 'warning');
        return;
    }
    
    // Show loading state
    const reportSummary = document.getElementById('report-summary');
    const generateBtn = document.getElementById('generate-report-btn');
    const originalBtnContent = generateBtn.innerHTML;
    
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Generating...</span>';
    generateBtn.disabled = true;
    
    // Show custom date range if selected
    const period = document.getElementById('report-period').value;
    const customRangeDiv = document.getElementById('custom-date-range');
    if (period === 'custom') {
        customRangeDiv.classList.add('show');
    } else {
        customRangeDiv.classList.remove('show');
    }
    
    if (userTransactions.length === 0) {
        setTimeout(() => {
            reportSummary.innerHTML = `
                <div class="empty-report">
                    <i class="fas fa-chart-bar"></i>
                    <h3>No Transactions Found</h3>
                    <p>You haven't made any transactions yet. Start by adding money or expenses.</p>
                </div>
            `;
            document.getElementById('download-report-btn').style.display = 'none';
            generateBtn.innerHTML = originalBtnContent;
            generateBtn.disabled = false;
        }, 300);
        return;
    }
    
    const type = document.getElementById('report-type').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    // Filter transactions
    const filters = {
        period: period,
        type: type,
        startDate: startDate,
        endDate: endDate
    };
    
    const filteredTransactions = expenseDB.getFilteredTransactions(currentUser.id, filters);
    
    if (filteredTransactions.length === 0) {
        setTimeout(() => {
            reportSummary.innerHTML = `
                <div class="empty-report">
                    <i class="fas fa-filter"></i>
                    <h3>No Transactions Found</h3>
                    <p>No transactions match your filter criteria. Try changing your filters.</p>
                </div>
            `;
            document.getElementById('download-report-btn').style.display = 'none';
            generateBtn.innerHTML = originalBtnContent;
            generateBtn.disabled = false;
        }, 300);
        return;
    }
    
    // Calculate report totals
    const reportTotals = calculateReportTotals(filteredTransactions);
    
    // Create report with mobile-friendly design
    setTimeout(() => {
        const reportHTML = createMobileFriendlyReport(reportTotals, filteredTransactions);
        
        reportSummary.innerHTML = reportHTML;
        document.getElementById('download-report-btn').style.display = 'flex';
        
        // Initialize view toggle
        initializeViewToggle();
        
        generateBtn.innerHTML = originalBtnContent;
        generateBtn.disabled = false;
        
        // Add CSS for the generated report
        addReportStyles();
        
    }, 300);
}

// Calculate report totals
function calculateReportTotals(transactions) {
    let totalAdded = 0;
    let totalSpent = 0;
    
    transactions.forEach(transaction => {
        if (transaction.type === 'credit') {
            totalAdded += transaction.amount || 0;
        } else {
            totalSpent += transaction.amount || 0;
        }
    });
    
    const netBalance = totalAdded - totalSpent;
    const totalTransactions = transactions.length;
    const avgTransaction = totalTransactions > 0 ? (totalAdded + totalSpent) / totalTransactions : 0;
    
    return {
        totalAdded,
        totalSpent,
        netBalance,
        totalTransactions,
        avgTransaction
    };
}

// ===============================
// CREATE MOBILE FRIENDLY REPORT
// ===============================
function createMobileFriendlyReport(totals, transactions) {
    // Sort transactions by date (newest first)
    transactions.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA;
    });
    
    // Format date for display
    function formatDisplayDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = parseDate(dateStr);
        return date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
    
    // Create mobile transaction cards
    let mobileCardsHTML = '';
    transactions.forEach((transaction, index) => {
        const isCredit = transaction.type === 'credit';
        const date = formatDisplayDate(transaction.date);
        const time = transaction.time || 'N/A';
        const month = transaction.date ? transaction.date.split('-')[1] : 'N/A';
        const year = transaction.date ? transaction.date.split('-')[2] : 'N/A';
        
        mobileCardsHTML += `
            <div class="transaction-card ${isCredit ? 'credit' : 'debit'}">
                <div class="transaction-card-header">
                    <span class="transaction-type-badge ${isCredit ? 'credit' : 'debit'}">
                        ${isCredit ? 'Credit' : 'Debit'}
                    </span>
                    <span class="transaction-amount-mobile ${isCredit ? 'positive' : 'negative'}">
                        ${isCredit ? '+' : '-'}$${formatNumber(transaction.amount || 0)}
                    </span>
                </div>
                <div class="transaction-card-body">
                    <div class="transaction-info">
                        <div class="transaction-info-row">
                            <span class="transaction-info-label">Date:</span>
                            <span class="transaction-info-value">${date}</span>
                        </div>
                        <div class="transaction-info-row">
                            <span class="transaction-info-label">Time:</span>
                            <span class="transaction-info-value">${time}</span>
                        </div>
                    </div>
                    <div class="transaction-info">
                        <div class="transaction-info-row">
                            <span class="transaction-info-label">Month:</span>
                            <span class="transaction-info-value">${month}</span>
                        </div>
                        <div class="transaction-info-row">
                            <span class="transaction-info-label">Year:</span>
                            <span class="transaction-info-value">${year}</span>
                        </div>
                    </div>
                </div>
                <div class="transaction-description">
                    <strong>Description:</strong> ${transaction.description || 'No description'}
                </div>
                <div class="transaction-info-row" style="margin-top: 8px;">
                    <span class="transaction-info-label">Category:</span>
                    <span class="transaction-info-value">${transaction.category || 'General'}</span>
                </div>
            </div>
        `;
    });
    
    // Create desktop table rows
    let desktopTableRows = '';
    transactions.forEach((transaction, index) => {
        const isCredit = transaction.type === 'credit';
        const date = formatDisplayDate(transaction.date);
        const time = transaction.time || 'N/A';
        const month = transaction.date ? transaction.date.split('-')[1] : 'N/A';
        const year = transaction.date ? transaction.date.split('-')[2] : 'N/A';
        
        desktopTableRows += `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <span class="transaction-type ${isCredit ? 'credit' : 'debit'}">
                        ${isCredit ? 'Credit' : 'Debit'}
                    </span>
                </td>
                <td>
                    <div class="date-time">
                        <div><strong>${date}</strong></div>
                        <small>${time}</small>
                    </div>
                </td>
                <td>
                    <div>Month: <strong>${month}</strong></div>
                    <div>Year: <strong>${year}</strong></div>
                </td>
                <td class="description-cell" title="${transaction.description || 'No description'}">
                    ${transaction.description || 'No description'}
                </td>
                <td>${transaction.category || 'General'}</td>
                <td class="amount ${isCredit ? 'positive' : 'negative'}">
                    ${isCredit ? '+' : '-'}$${formatNumber(transaction.amount || 0)}
                </td>
                <td class="amount ${isCredit ? 'positive' : 'negative'}">
                    ${isCredit ? 'Added' : 'Spent'}
                </td>
            </tr>
        `;
    });
    
    return `
        <div class="report-content">
            <div class="report-summary-cards">
                <div class="summary-card total-added">
                    <h4><i class="fas fa-money-bill-wave"></i> Total Added</h4>
                    <div class="value">$${formatNumber(totals.totalAdded)}</div>
                </div>
                <div class="summary-card total-spent">
                    <h4><i class="fas fa-shopping-cart"></i> Total Spent</h4>
                    <div class="value">$${formatNumber(totals.totalSpent)}</div>
                </div>
                <div class="summary-card net-balance ${totals.netBalance >= 0 ? 'positive' : 'negative'}">
                    <h4><i class="fas fa-wallet"></i> Net Balance</h4>
                    <div class="value">$${formatNumber(totals.netBalance)}</div>
                </div>
                <div class="summary-card total-transactions">
                    <h4><i class="fas fa-exchange-alt"></i> Total Transactions</h4>
                    <div class="value">${totals.totalTransactions}</div>
                </div>
            </div>
            
            <!-- View Toggle for Mobile -->
            <div class="report-view-toggle">
                <button class="view-toggle-btn active" onclick="switchReportView('cards')">
                    <i class="fas fa-th-large"></i> Cards
                </button>
                <button class="view-toggle-btn" onclick="switchReportView('table')">
                    <i class="fas fa-table"></i> Table
                </button>
            </div>
            
            <!-- Mobile Cards View -->
            <div id="mobile-cards-view" class="mobile-view">
                ${mobileCardsHTML}
            </div>
            
            <!-- Desktop Table View -->
            <div class="report-table-container">
                <table class="report-table-desktop">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th><i class="fas fa-exchange-alt"></i> Type</th>
                            <th><i class="fas fa-calendar"></i> Date & Time</th>
                            <th><i class="fas fa-calendar-alt"></i> Month/Year</th>
                            <th><i class="fas fa-file-alt"></i> Description</th>
                            <th><i class="fas fa-tag"></i> Category</th>
                            <th><i class="fas fa-money-bill"></i> Amount</th>
                            <th><i class="fas fa-info-circle"></i> Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${desktopTableRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="6" style="text-align: right; font-weight: bold; padding: 15px;">
                                <strong>Total Added:</strong>
                            </td>
                            <td class="amount positive">$${formatNumber(totals.totalAdded)}</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td colspan="6" style="text-align: right; font-weight: bold; padding: 15px;">
                                <strong>Total Spent:</strong>
                            </td>
                            <td class="amount negative">$${formatNumber(totals.totalSpent)}</td>
                            <td></td>
                        </tr>
                        <tr style="background: rgba(67, 97, 238, 0.1);">
                            <td colspan="6" style="text-align: right; font-weight: bold; padding: 15px;">
                                <strong>Net Balance:</strong>
                            </td>
                            <td class="amount ${totals.netBalance >= 0 ? 'positive' : 'negative'}" style="font-size: 18px;">
                                $${formatNumber(totals.netBalance)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <!-- Mobile Totals View -->
            <div class="report-totals-mobile">
                <div class="report-totals-card">
                    <div class="report-totals-row">
                        <span class="report-totals-label">Total Added:</span>
                        <span class="report-totals-value positive">$${formatNumber(totals.totalAdded)}</span>
                    </div>
                    <div class="report-totals-row">
                        <span class="report-totals-label">Total Spent:</span>
                        <span class="report-totals-value negative">$${formatNumber(totals.totalSpent)}</span>
                    </div>
                    <div class="report-totals-row" style="border-top: 2px solid var(--primary); padding-top: 12px; margin-top: 8px;">
                        <span class="report-totals-label">Net Balance:</span>
                        <span class="report-totals-value ${totals.netBalance >= 0 ? 'positive' : 'negative'}" style="font-size: 18px;">
                            $${formatNumber(totals.netBalance)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="report-info">
                <p><i class="fas fa-info-circle"></i> Showing ${transactions.length} transactions</p>
                <p><i class="fas fa-calendar"></i> Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                <p><i class="fas fa-user"></i> User: ${currentUser.fullName}</p>
            </div>
        </div>
    `;
}

// ===============================
// INITIALIZE VIEW TOGGLE
// ===============================
function initializeViewToggle() {
    const cardsView = document.getElementById('mobile-cards-view');
    const tableView = document.querySelector('.report-table-container');
    const totalsView = document.querySelector('.report-totals-mobile');
    
    if (!cardsView || !tableView) return;
    
    // Check screen size and set initial view
    if (window.innerWidth <= 767) {
        // Mobile - Show cards by default
        cardsView.style.display = 'block';
        tableView.style.display = 'none';
        if (totalsView) totalsView.style.display = 'block';
    } else {
        // Desktop - Show table by default
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
        if (totalsView) totalsView.style.display = 'none';
    }
}

// ===============================
// SWITCH REPORT VIEW (MOBILE)
// ===============================
function switchReportView(viewType) {
    const cardsView = document.getElementById('mobile-cards-view');
    const tableView = document.querySelector('.report-table-container');
    const totalsView = document.querySelector('.report-totals-mobile');
    const cardButtons = document.querySelectorAll('.view-toggle-btn');
    
    if (!cardsView || !tableView) return;
    
    cardButtons.forEach(btn => btn.classList.remove('active'));
    
    if (viewType === 'cards') {
        cardsView.style.display = 'block';
        tableView.style.display = 'none';
        if (totalsView) totalsView.style.display = 'block';
        document.querySelector('.view-toggle-btn:nth-child(1)').classList.add('active');
    } else {
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
        if (totalsView) totalsView.style.display = 'none';
        document.querySelector('.view-toggle-btn:nth-child(2)').classList.add('active');
    }
}

// ===============================
// ADD REPORT STYLES
// ===============================
function addReportStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .mobile-view {
            animation: fadeIn 0.5s ease;
        }
        
        .report-table-container::-webkit-scrollbar {
            height: 6px;
        }
        
        .report-table-container::-webkit-scrollbar-track {
            background: var(--light-gray);
            border-radius: 10px;
        }
        
        .report-table-container::-webkit-scrollbar-thumb {
            background: var(--primary);
            border-radius: 10px;
        }
        
        .report-table-container::-webkit-scrollbar-thumb:hover {
            background: var(--primary-dark);
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    
    // Remove existing style if any
    const existingStyle = document.getElementById('report-custom-styles');
    if (existingStyle) existingStyle.remove();
    
    style.id = 'report-custom-styles';
    document.head.appendChild(style);
}

// ===============================
// PDF DOWNLOAD FUNCTION
// ===============================
function downloadPDFReport() {
    if (!currentUser) {
        showNotification('Please login first', 'warning');
        return;
    }
    
    try {
        // Get filter values
        const period = document.getElementById('report-period').value;
        const type = document.getElementById('report-type').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        // Filter transactions
        const filters = {
            period: period,
            type: type,
            startDate: startDate,
            endDate: endDate
        };
        
        const filteredTransactions = expenseDB.getFilteredTransactions(currentUser.id, filters);
        
        if (filteredTransactions.length === 0) {
            showNotification('No transactions to download', 'warning');
            return;
        }
        
        // Calculate totals
        const totals = calculateReportTotals(filteredTransactions);
        
        // Create PDF
        createPDFReport(totals, filteredTransactions);
        
    } catch (error) {
        console.error('Error downloading PDF report:', error);
        showNotification('Error generating PDF report', 'error');
    }
}

// Create PDF Report
function createPDFReport(totals, transactions) {
    try {
        // Load jsPDF library dynamically
        if (typeof jsPDF === 'undefined') {
            showNotification('Loading PDF library...', 'info');
            loadPDFLibrary().then(() => {
                generatePDF(totals, transactions);
            });
        } else {
            generatePDF(totals, transactions);
        }
    } catch (error) {
        console.error('Error creating PDF:', error);
        showNotification('PDF library not loaded. Please check internet connection.', 'error');
    }
}

// Load PDF library dynamically
function loadPDFLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof jsPDF !== 'undefined') {
            resolve();
            return;
        }
        
        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script1.onload = function() {
            const script2 = document.createElement('script');
            script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
            script2.onload = resolve;
            script2.onerror = reject;
            document.head.appendChild(script2);
        };
        script1.onerror = reject;
        document.head.appendChild(script1);
    });
}

// Generate PDF document
function generatePDF(totals, transactions) {
    // Sort transactions by date (newest first)
    transactions.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA;
    });
    
    // Create new PDF document
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Set document properties
    doc.setProperties({
        title: `Expense Report - ${currentUser.fullName}`,
        subject: 'Financial Transaction Report',
        author: 'Expense Manager',
        keywords: 'expense, finance, transaction, report',
        creator: 'Expense Manager App'
    });
    
    // Add header
    doc.setFontSize(20);
    doc.setTextColor(33, 150, 243); // Blue color
    doc.text('Expense Manager - Transaction Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated for: ${currentUser.fullName}`, 105, 30, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 105, 36, { align: 'center' });
    
    // Add filter information
    const period = document.getElementById('report-period').value;
    const type = document.getElementById('report-type').value;
    
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Period: ${getPeriodLabel(period)} | Type: ${getTypeLabel(type)}`, 105, 44, { align: 'center' });
    
    // Add summary section
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text('SUMMARY', 20, 55);
    
    // Add summary boxes
    const summaryData = [
        ['Total Added', `$${formatNumber(totals.totalAdded)}`, [76, 175, 80]], // Green
        ['Total Spent', `$${formatNumber(totals.totalSpent)}`, [244, 67, 54]], // Red
        ['Net Balance', `$${formatNumber(totals.netBalance)}`, totals.netBalance >= 0 ? [76, 175, 80] : [244, 67, 54]],
        ['Transactions', totals.totalTransactions, [33, 150, 243]] // Blue
    ];
    
    let yPos = 65;
    summaryData.forEach(([label, value, color], index) => {
        const xPos = 20 + (index % 2) * 85;
        if (index % 2 === 0 && index > 0) yPos += 25;
        
        // Draw box
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(xPos, yPos, 80, 20, 3, 3, 'F');
        
        // Add label
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text(label, xPos + 5, yPos + 8);
        
        // Add value
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(value.toString(), xPos + 5, yPos + 16);
        doc.setFont('helvetica', 'normal');
    });
    
    yPos += 30;
    
    // Add transaction table
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text('TRANSACTION DETAILS', 20, yPos);
    yPos += 10;
    
    // Prepare table data
    const tableData = transactions.map((transaction, index) => {
        const isCredit = transaction.type === 'credit';
        const date = formatDisplayDate(transaction.date);
        const time = transaction.time || 'N/A';
        const month = transaction.date ? transaction.date.split('-')[1] : 'N/A';
        const year = transaction.date ? transaction.date.split('-')[2] : 'N/A';
        
        return [
            (index + 1).toString(),
            isCredit ? 'Credit' : 'Debit',
            `${date}\n${time}`,
            `M: ${month}\nY: ${year}`,
            transaction.description || 'No description',
            transaction.category || 'General',
            `${isCredit ? '+' : '-'}$${formatNumber(transaction.amount || 0)}`,
            isCredit ? 'Added' : 'Spent'
        ];
    });
    
    // Add table headers
    const headers = [
        ['#', 'Type', 'Date & Time', 'Month/Year', 'Description', 'Category', 'Amount', 'Status']
    ];
    
    // Generate table
    doc.autoTable({
        startY: yPos,
        head: headers,
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [33, 150, 243],
            textColor: 255,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 10 }, // #
            1: { cellWidth: 15 }, // Type
            2: { cellWidth: 25 }, // Date
            3: { cellWidth: 20 }, // Month/Year
            4: { cellWidth: 40 }, // Description
            5: { cellWidth: 25 }, // Category
            6: { cellWidth: 25 }, // Amount
            7: { cellWidth: 20 }  // Status
        },
        didDrawCell: function(data) {
            // Color code amount column
            if (data.column.index === 6) {
                const value = data.cell.text[0];
                if (value.startsWith('+')) {
                    doc.setTextColor(76, 175, 80); // Green for positive
                } else if (value.startsWith('-')) {
                    doc.setTextColor(244, 67, 54); // Red for negative
                }
            }
            
            // Color code type column
            if (data.column.index === 1) {
                const value = data.cell.text[0];
                if (value === 'Credit') {
                    doc.setTextColor(76, 175, 80); // Green
                } else if (value === 'Debit') {
                    doc.setTextColor(244, 67, 54); // Red
                }
            }
            
            // Reset color
            doc.setTextColor(0, 0, 0);
        },
        margin: { top: 10 }
    });
    
    // Add totals at the end
    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    
    // Total Added
    doc.setTextColor(76, 175, 80);
    doc.text('Total Added:', 130, finalY);
    doc.text(`$${formatNumber(totals.totalAdded)}`, 180, finalY);
    
    // Total Spent
    doc.setTextColor(244, 67, 54);
    doc.text('Total Spent:', 130, finalY + 7);
    doc.text(`$${formatNumber(totals.totalSpent)}`, 180, finalY + 7);
    
    // Net Balance
    const netColor = totals.netBalance >= 0 ? [76, 175, 80] : [244, 67, 54];
    doc.setTextColor(netColor[0], netColor[1], netColor[2]);
    doc.setFontSize(12);
    doc.text('Net Balance:', 130, finalY + 17);
    doc.text(`$${formatNumber(totals.netBalance)}`, 180, finalY + 17);
    
    // Add page number if needed
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
    }
    
    // Save PDF
    const date = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `Expense_Report_${currentUser.firstName}_${date}_${timeStr}.pdf`;
    
    doc.save(filename);
    
    showNotification('PDF report downloaded successfully!', 'success');
}

// Helper functions for PDF generation
function getPeriodLabel(period) {
    const labels = {
        'all': 'All Time',
        'today': 'Today',
        'week': 'This Week',
        'month': 'This Month',
        'year': 'This Year',
        'custom': 'Custom Range'
    };
    return labels[period] || period;
}

function getTypeLabel(type) {
    const labels = {
        'all': 'All Transactions',
        'credit': 'Money Added Only',
        'debit': 'Expenses Only'
    };
    return labels[type] || type;
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = parseDate(dateStr);
    return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ===============================
// UPDATE TRANSACTION LIST
// ===============================
function updateTransactionList() {
    const transactionsList = document.getElementById('transactions-list');
    
    if (!userTransactions || userTransactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exchange-alt"></i>
                <h4>No Transactions Yet</h4>
                <p>Start by adding money or expenses to see your transaction history</p>
            </div>
        `;
        return;
    }
    
    // Sort by date (newest first)
    const sortedTransactions = [...userTransactions].sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA;
    }).slice(0, 5); // Show only 5 most recent
    
    let transactionsHTML = '';
    
    sortedTransactions.forEach(transaction => {
        const isCredit = transaction.type === 'credit';
        const date = transaction.date || 'Unknown Date';
        const time = transaction.time || 'Unknown Time';
        
        transactionsHTML += `
            <div class="transaction-item">
                <div class="transaction-icon ${isCredit ? 'credit' : 'debit'}">
                    <i class="fas ${isCredit ? 'fa-plus-circle' : 'fa-minus-circle'}"></i>
                </div>
                <div class="transaction-details">
                    <div class="transaction-title">${transaction.description || (isCredit ? 'Money Added' : 'Expense')}</div>
                    <div class="transaction-meta">
                        <span><i class="far fa-calendar"></i> ${date}</span>
                        <span><i class="far fa-clock"></i> ${time}</span>
                        <span><i class="fas fa-tag"></i> ${transaction.category || 'General'}</span>
                    </div>
                </div>
                <div class="transaction-amount ${isCredit ? 'credit' : 'debit'}">
                    ${isCredit ? '+' : '-'}$${formatNumber(transaction.amount || 0)}
                </div>
            </div>
        `;
    });
    
    transactionsList.innerHTML = transactionsHTML;
}

// ===============================
// HELPER FUNCTIONS
// ===============================
function formatNumber(num) {
    return parseFloat(num || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function parseDate(dateStr) {
    return expenseDB.parseDate(dateStr);
}

// ===============================
// ADD RESIZE EVENT LISTENER
// ===============================
window.addEventListener('resize', function() {
    const cardsView = document.getElementById('mobile-cards-view');
    const tableView = document.querySelector('.report-table-container');
    const totalsView = document.querySelector('.report-totals-mobile');
    
    if (!cardsView || !tableView) return;
    
    if (window.innerWidth <= 767) {
        // Mobile
        const activeView = document.querySelector('.view-toggle-btn.active');
        if (activeView) {
            if (activeView.textContent.includes('Cards')) {
                cardsView.style.display = 'block';
                tableView.style.display = 'none';
                if (totalsView) totalsView.style.display = 'block';
            } else {
                cardsView.style.display = 'none';
                tableView.style.display = 'block';
                if (totalsView) totalsView.style.display = 'none';
            }
        }
    } else {
        // Desktop - always show table
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
        if (totalsView) totalsView.style.display = 'none';
    }
});

// Initialize the page
window.onload = function() {
    // Add CSS for report styles
    const style = document.createElement('style');
    style.textContent = `
        .positive { color: var(--success); }
        .negative { color: var(--danger); }
    `;
    document.head.appendChild(style);
};