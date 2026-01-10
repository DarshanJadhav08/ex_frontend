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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            if (currentUser && currentUser.id) {
                showDashboard();
                loadUserData();
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
                customRangeDiv.style.display = 'flex';
                
                // Set default dates (last 30 days)
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 30);
                
                document.getElementById('start-date').value = startDate.toISOString().split('T')[0];
                document.getElementById('end-date').value = endDate.toISOString().split('T')[0];
            } else {
                customRangeDiv.style.display = 'none';
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
        // Get all users from API
        const response = await fetch(`${API}/users`);
        const result = await response.json();
        
        if (result.success && result.data) {
            // Find user by first and last name
            const user = result.data.find(u => 
                u.First_Name.toLowerCase() === firstName.toLowerCase() && 
                u.Last_Name.toLowerCase() === lastName.toLowerCase()
            );
            
            if (user) {
                // In a real app, you would verify password here
                // For this demo, we'll accept any non-empty password
                if (password.length < 6) {
                    showNotification('Password must be at least 6 characters', 'warning');
                    return;
                }
                
                // Get user's current balance and transactions
                const userDetails = await fetch(`${API}/user/${user.id}`).then(r => r.json());
                const userData = userDetails.success ? userDetails.data : user;
                
                // Create user object
                currentUser = {
                    id: user.id,
                    firstName: user.First_Name,
                    lastName: user.Last_Name,
                    fullName: `${user.First_Name} ${user.Last_Name}`,
                    initialAmount: userData.Total_Amount || 0,
                    joinDate: userData.Date || new Date().toLocaleDateString()
                };
                
                // Save to localStorage
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Show dashboard
                showDashboard();
                loadUserData();
                
                showNotification(`Welcome back, ${currentUser.firstName}!`, 'success');
                
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
    
    try {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        
        const body = {
            First_Name: firstName,
            Last_Name: lastName,
            Total_Amount: Number(amount),
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
            currentUser = {
                id: result.data.id,
                firstName: firstName,
                lastName: lastName,
                fullName: `${firstName} ${lastName}`,
                initialAmount: Number(amount),
                joinDate: `${day}-${month}-${year}`,
                password: password
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showNotification('Account created successfully!', 'success');
            
            // Show dashboard
            showDashboard();
            loadUserData();
            
        } else {
            showNotification(result.error || 'Registration failed. User might already exist.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Network error. Please check your connection.', 'error');
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
// GET USER TRANSACTIONS (Permanent Storage)
// ===============================
async function getUserTransactions(userId) {
    try {
        // Try to get actual transactions from backend if endpoint exists
        try {
            const transactionsRes = await fetch(`${API}/user/${userId}/transactions`);
            if (transactionsRes.ok) {
                const transactionsResult = await transactionsRes.json();
                if (transactionsResult.success && transactionsResult.data) {
                    return transactionsResult.data.map(t => ({
                        ...t,
                        date: t.date || getCurrentDate(),
                        time: t.time || getCurrentTime()
                    }));
                }
            }
        } catch (e) {
            // API endpoint doesn't exist, check localStorage
        }
        
        // Local storage madhun data gheta yenara
        const savedTransactions = localStorage.getItem(`user_${userId}_transactions`);
        if (savedTransactions) {
            return JSON.parse(savedTransactions);
        }
        
        // If nothing found, return initial transaction
        return [{
            id: 1,
            type: 'credit',
            amount: currentUser.initialAmount || 0,
            description: 'Initial Amount',
            category: 'Initial',
            date: currentUser.joinDate || getCurrentDate(),
            time: getCurrentTime()
        }];
        
    } catch (error) {
        console.error('Error getting transactions:', error);
        return [];
    }
}

// ===============================
// SAVE USER TRANSACTIONS
// ===============================
function saveUserTransactions(userId, transactions) {
    try {
        // Local storage madhe save kara
        localStorage.setItem(`user_${userId}_transactions`, JSON.stringify(transactions));
        
        // Try to save to API if endpoint exists
        try {
            fetch(`${API}/user/${userId}/save-transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transactions: transactions })
            }).catch(e => console.log('API save endpoint not available'));
        } catch (e) {
            // API nahi asel tari chalta
        }
    } catch (error) {
        console.error('Error saving transactions:', error);
    }
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
        
        // Get user details
        const userRes = await fetch(`${API}/user/${currentUser.id}`);
        const userResult = await userRes.json();
        
        if (!userResult.success) {
            showNotification('Error loading user data', 'error');
            return;
        }
        
        const user = userResult.data;
        
        // Get transactions from permanent storage
        userTransactions = await getUserTransactions(currentUser.id);
        
        // If no transactions but has initial amount, create initial transaction
        if (userTransactions.length === 0 && user.Total_Amount > 0) {
            userTransactions = [{
                id: 1,
                type: 'credit',
                amount: user.Total_Amount,
                description: 'Initial Amount',
                category: 'Initial',
                date: user.Date || getCurrentDate(),
                time: getCurrentTime()
            }];
            saveUserTransactions(currentUser.id, userTransactions);
        }
        
        // Calculate totals
        calculateUserStats();
        
        // Update UI with stats
        updateStatsUI();
        
        // Update transaction list
        updateTransactionList();
        
        // Update current user with latest data
        currentUser.balance = userStats.currentBalance;
        currentUser.totalAdded = userStats.totalAdded;
        currentUser.totalSpent = userStats.totalSpent;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Connection error. Please try again.', 'error');
        document.getElementById('transactions-list').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>Error Loading Data</h4>
                <p>Please check your connection and try again</p>
            </div>
        `;
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

function getPastDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// ===============================
// CALCULATE USER STATS
// ===============================
function calculateUserStats() {
    let totalAdded = currentUser.initialAmount || 0;
    let totalSpent = 0;
    let totalTransactions = userTransactions.length;
    
    // Calculate from transactions
    userTransactions.forEach(transaction => {
        if (transaction.type === 'credit') {
            totalAdded += transaction.amount || 0;
        } else if (transaction.type === 'debit') {
            totalSpent += transaction.amount || 0;
        }
    });
    
    const currentBalance = totalAdded - totalSpent;
    const avgExpense = totalTransactions > 0 ? (totalSpent / totalTransactions) : 0;
    
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
        // Add money through backend API
        const res = await fetch(`${API}/add-money-by-name`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                first_name: currentUser.firstName,
                last_name: currentUser.lastName,
                add_amount: Number(amount)
            })
        });

        const result = await res.json();
        
        if (result.success) {
            // Add transaction to local list
            const newTransaction = {
                id: Date.now(),
                type: 'credit',
                amount: Number(amount),
                description: description,
                category: 'Income',
                date: getCurrentDate(),
                time: getCurrentTime()
            };
            
            // Get existing transactions first
            const existingTransactions = await getUserTransactions(currentUser.id);
            existingTransactions.unshift(newTransaction); // Add to beginning
            
            // Save updated transactions
            userTransactions = existingTransactions;
            saveUserTransactions(currentUser.id, userTransactions);
            
            // Update stats
            calculateUserStats();
            updateStatsUI();
            updateTransactionList();
            
            // Clear form
            document.getElementById('add-amount').value = '';
            document.getElementById('add-description').value = '';
            
            showNotification(`Successfully added $${amount} to your account`, 'success');
            
        } else {
            showNotification(result.error || 'Failed to add money', 'error');
        }
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
        // Add expense through backend API
        const res = await fetch(`${API}/user/${currentUser.id}/expense`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                expense: Number(amount),
                category: category,
                description: description
            })
        });

        const result = await res.json();
        
        if (result.success) {
            // Add transaction to local list
            const newTransaction = {
                id: Date.now(),
                type: 'debit',
                amount: Number(amount),
                description: description,
                category: category,
                date: getCurrentDate(),
                time: getCurrentTime()
            };
            
            // Get existing transactions first
            const existingTransactions = await getUserTransactions(currentUser.id);
            existingTransactions.unshift(newTransaction); // Add to beginning
            
            // Save updated transactions
            userTransactions = existingTransactions;
            saveUserTransactions(currentUser.id, userTransactions);
            
            // Update stats
            calculateUserStats();
            updateStatsUI();
            updateTransactionList();
            
            // Clear form
            document.getElementById('expense-amount').value = '';
            document.getElementById('expense-category').value = '';
            document.getElementById('expense-description').value = '';
            
            showNotification(`Expense of $${amount} added successfully`, 'success');
            
        } else {
            showNotification(result.error || 'Failed to add expense', 'error');
        }
    } catch (err) {
        console.error(err);
        showNotification('Error adding expense', 'error');
    }
}

// ===============================
// GENERATE REPORT WITH TABLE
// ===============================
function generateReport() {
    if (!currentUser) {
        showNotification('Please login first', 'warning');
        return;
    }
    
    // Show custom date range if selected
    const period = document.getElementById('report-period').value;
    const customRangeDiv = document.getElementById('custom-date-range');
    if (period === 'custom') {
        customRangeDiv.style.display = 'flex';
    } else {
        customRangeDiv.style.display = 'none';
    }
    
    if (userTransactions.length === 0) {
        document.getElementById('report-summary').innerHTML = `
            <div class="empty-report">
                <i class="fas fa-chart-bar"></i>
                <h3>No Transactions Found</h3>
                <p>You haven't made any transactions yet. Start by adding money or expenses.</p>
            </div>
        `;
        document.getElementById('download-report-btn').style.display = 'none';
        return;
    }
    
    const type = document.getElementById('report-type').value;
    
    // Filter transactions based on period and type
    let filteredTransactions = filterTransactionsByPeriodAndType(period, type);
    
    if (filteredTransactions.length === 0) {
        document.getElementById('report-summary').innerHTML = `
            <div class="empty-report">
                <i class="fas fa-filter"></i>
                <h3>No Transactions Found</h3>
                <p>No transactions match your filter criteria. Try changing your filters.</p>
            </div>
        `;
        document.getElementById('download-report-btn').style.display = 'none';
        return;
    }
    
    // Calculate report totals
    const reportTotals = calculateReportTotals(filteredTransactions);
    
    // Create report with table
    const reportHTML = createReportHTML(reportTotals, filteredTransactions);
    
    document.getElementById('report-summary').innerHTML = reportHTML;
    document.getElementById('download-report-btn').style.display = 'flex';
    
    // Add custom styles for table
    addTableStyles();
}

// Filter transactions by period and type
function filterTransactionsByPeriodAndType(period, type) {
    let filteredTransactions = [...userTransactions];
    
    // Filter by type
    if (type !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === type);
    }
    
    // Filter by period
    if (period !== 'all') {
        const today = new Date();
        let startDate = new Date();
        
        switch(period) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                filteredTransactions = filteredTransactions.filter(t => {
                    const transDate = parseDate(t.date);
                    return transDate >= startDate;
                });
                break;
            case 'week':
                startDate.setDate(today.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(today.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(today.getFullYear() - 1);
                break;
            case 'custom':
                const startInput = document.getElementById('start-date').value;
                const endInput = document.getElementById('end-date').value;
                
                if (startInput && endInput) {
                    const start = new Date(startInput);
                    const end = new Date(endInput);
                    end.setHours(23, 59, 59, 999);
                    
                    filteredTransactions = filteredTransactions.filter(t => {
                        const transDate = parseDate(t.date);
                        return transDate >= start && transDate <= end;
                    });
                }
                break;
        }
        
        if (period !== 'today' && period !== 'custom') {
            filteredTransactions = filteredTransactions.filter(t => {
                const transDate = parseDate(t.date);
                return transDate >= startDate;
            });
        }
    }
    
    return filteredTransactions;
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

// Create report HTML with table
function createReportHTML(totals, transactions) {
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
    
    // Create table rows
    let tableRows = '';
    transactions.forEach((transaction, index) => {
        const isCredit = transaction.type === 'credit';
        const date = formatDisplayDate(transaction.date);
        const time = transaction.time || 'N/A';
        const month = transaction.date ? transaction.date.split('-')[1] : 'N/A';
        const year = transaction.date ? transaction.date.split('-')[2] : 'N/A';
        
        tableRows += `
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
                <td class="description" title="${transaction.description || 'No description'}">
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
            
            <div class="report-table-container">
                <table class="report-table">
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
                        ${tableRows}
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
            
            <div class="report-info">
                <p><i class="fas fa-info-circle"></i> Showing ${transactions.length} transactions</p>
                <p><i class="fas fa-calendar"></i> Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                <p><i class="fas fa-user"></i> User: ${currentUser.fullName}</p>
            </div>
        </div>
    `;
}

// Add table styles
function addTableStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .report-content {
            animation: fadeInUp 0.5s ease;
        }
        
        .report-info {
            margin-top: 20px;
            padding: 15px;
            background: var(--light);
            border-radius: var(--border-radius-sm);
            font-size: 14px;
            color: var(--gray);
        }
        
        .report-info p {
            margin: 5px 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .report-info i {
            color: var(--primary);
        }
        
        table tfoot {
            background: white;
            border-top: 2px solid var(--primary);
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    
    // Remove existing style if any
    const existingStyle = document.getElementById('table-report-style');
    if (existingStyle) existingStyle.remove();
    
    style.id = 'table-report-style';
    document.head.appendChild(style);
}

// ===============================
// PDF DOWNLOAD FUNCTION
// ===============================
function downloadReport() {
    if (!currentUser) {
        showNotification('Please login first', 'warning');
        return;
    }
    
    const reportContent = document.getElementById('report-summary');
    if (!reportContent || reportContent.querySelector('.empty-report')) {
        showNotification('No report to download. Please generate a report first.', 'warning');
        return;
    }
    
    try {
        // Get filter values
        const period = document.getElementById('report-period').value;
        const type = document.getElementById('report-type').value;
        
        // Get filtered transactions
        const filteredTransactions = filterTransactionsByPeriodAndType(period, type);
        
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
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `Expense_Report_${currentUser.firstName}_${date}_${time}.pdf`;
    
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
    if (!dateStr) return new Date();
    
    // Try different date formats
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            // Check if format is DD-MM-YYYY or YYYY-MM-DD
            if (parts[0].length === 4) {
                // YYYY-MM-DD format
                return new Date(parts[0], parts[1] - 1, parts[2]);
            } else {
                // DD-MM-YYYY format
                return new Date(parts[2], parts[1] - 1, parts[0]);
            }
        }
    }
    
    // Try parsing as ISO string
    const parsed = new Date(dateStr);
    if (!isNaN(parsed)) return parsed;
    
    // Return current date as fallback
    return new Date();
}

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