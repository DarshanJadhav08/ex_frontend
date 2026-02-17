const API_BASE = "https://expense-backend-9.onrender.com";

let USER_ID = null;
let USER_NAME = "";
let USER_BALANCE = 0;
let IS_LOGGED_IN = false;
let TOTAL_INCOME = 0;
let TOTAL_EXPENSE = 0;
let ALL_TRANSACTIONS = [];

// DOM Elements
const authSection = document.getElementById('auth-section');
const mainContent = document.getElementById('main-content');
const loginCard = document.getElementById('login-card');
const registerCard = document.getElementById('register-card');
const reportContent = document.getElementById('report-content');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

// PDF Configuration
const PDF_CONFIG = {
  pageSize: 'a4',
  orientation: 'portrait',
  margins: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  },
  colors: {
    primary: [44, 62, 80],
    success: [46, 204, 113],
    danger: [231, 76, 60],
    info: [52, 152, 219],
    warning: [241, 196, 15],
    dark: [52, 73, 94],
    light: [236, 240, 241]
  }
};

// Toggle between login and register cards
showRegisterLink.addEventListener('click', () => {
  loginCard.classList.add('hidden');
  registerCard.classList.remove('hidden');
  clearFormFields();
});

showLoginLink.addEventListener('click', () => {
  registerCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
  clearFormFields();
});

// Clear form fields
function clearFormFields() {
  document.getElementById('l_fname').value = '';
  document.getElementById('l_lname').value = '';
  document.getElementById('l_pass').value = '';
  document.getElementById('r_fname').value = '';
  document.getElementById('r_lname').value = '';
  document.getElementById('r_pass').value = '';
  document.getElementById('r_amount').value = '';
}

// Show notification
function showNotification(type, title, message, duration = 5000) {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  notification.innerHTML = `
    <div class="notification-icon">${icons[type] || icons.info}</div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, duration);

  return notification;
}

// Show loading
function showLoading() {
  const loading = document.createElement('div');
  loading.className = 'loading';
  loading.innerHTML = '<div class="loading-spinner"></div>';
  document.body.appendChild(loading);
  loading.classList.add('show');
  return loading;
}

// Hide loading
function hideLoading(loading) {
  if (loading && loading.parentNode) {
    loading.classList.remove('show');
    setTimeout(() => loading.remove(), 300);
  }
}

// Show main content after login
function showMainContent() {
  authSection.style.display = 'none';
  mainContent.style.display = 'block';
  IS_LOGGED_IN = true;
  clearFormFields();
}

// Show auth section after logout
function showAuthSection() {
  mainContent.style.display = 'none';
  authSection.style.display = 'flex';
  loginCard.classList.remove('hidden');
  registerCard.classList.add('hidden');
  IS_LOGGED_IN = false;
  clearFormFields();
}

// Update user info in UI
function updateUserInfo(firstName, lastName, balance) {
  USER_NAME = `${firstName} ${lastName}`;
  USER_BALANCE = parseFloat(balance) || 0;
  
  document.getElementById('user-name').textContent = `Welcome, ${firstName}`;
  document.getElementById('current-balance').textContent = USER_BALANCE.toFixed(2);
}

// Update quick stats display
function updateQuickStatsDisplay() {
  document.getElementById('total-income').textContent = `$${TOTAL_INCOME.toFixed(2)}`;
  document.getElementById('total-expense').textContent = `$${TOTAL_EXPENSE.toFixed(2)}`;
  document.getElementById('net-balance').textContent = `$${USER_BALANCE.toFixed(2)}`;
  document.getElementById('current-balance').textContent = USER_BALANCE.toFixed(2);
}

// Add transaction to history
function addTransaction(type, amount, description, category = null) {
  const transaction = {
    id: Date.now(),
    type: type,
    amount: parseFloat(amount),
    description: description,
    category: category,
    date: new Date().toISOString(),
    timestamp: new Date().toLocaleString()
  };
  
  ALL_TRANSACTIONS.unshift(transaction);
  
  if (ALL_TRANSACTIONS.length > 50) {
    ALL_TRANSACTIONS = ALL_TRANSACTIONS.slice(0, 50);
  }
}

// Update stats from API response
async function updateStatsFromAPI() {
  if (!USER_ID) return false;
  
  try {
    const statsRes = await fetch(`${API_BASE}/quick-stats?user_id=${USER_ID}`);
    
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      
      if (statsData && statsData.data) {
        const data = statsData.data;
        
        TOTAL_INCOME = parseFloat(data.total_amount) || 0;
        TOTAL_EXPENSE = parseFloat(data.spent_amount) || 0;
        USER_BALANCE = parseFloat(data.remaining_amount) || 0;
        
        updateQuickStatsDisplay();
        
        return true;
      }
    }
  } catch (error) {
    console.error("Update stats error:", error);
  }
  
  return false;
}

// Show report in UI
function showReport(reportData) {
  if (reportData && reportData.data) {
    const data = reportData.data;
    reportContent.innerHTML = '';
    
    const totalIncome = parseFloat(data.total_income) || TOTAL_INCOME;
    const totalExpense = parseFloat(data.total_expense) || TOTAL_EXPENSE;
    const netBalance = totalIncome - totalExpense;
    
    const summary = document.createElement('div');
    summary.className = 'report-summary';
    
    summary.innerHTML = `
      <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.2rem;">Financial Summary</h3>
      <div class="summary-item">
        <span class="summary-label">User</span>
        <span class="summary-value">${data.user || USER_NAME}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Income</span>
        <span class="summary-value" style="color: #2ecc71;">$${totalIncome.toFixed(2)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total Expenses</span>
        <span class="summary-value" style="color: #e74c3c;">$${totalExpense.toFixed(2)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Current Balance</span>
        <span class="summary-value" style="color: #3498db;">$${netBalance.toFixed(2)}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Net Balance (Income - Expenses):</span>
        <span class="summary-value" style="color: #9b59b6; font-weight: 700;">$${netBalance.toFixed(2)}</span>
      </div>
    `;
    
    reportContent.appendChild(summary);
    
    const pdfButtonContainer = document.createElement('div');
    pdfButtonContainer.style.margin = '20px 0';
    pdfButtonContainer.innerHTML = `
      <button onclick="downloadPDFReport()" style="
        background: #3498db;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s;
        margin: 0 auto;
      " onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
        📥 Download PDF Report
      </button>
      <p style="text-align: center; color: #7f8c8d; margin-top: 8px; font-size: 0.9rem;">
        Download a detailed PDF version of this report
      </p>
    `;
    
    reportContent.appendChild(pdfButtonContainer);
    
    if (ALL_TRANSACTIONS.length > 0) {
      const tableContainer = document.createElement('div');
      tableContainer.innerHTML = `
        <h3 style="color: #2c3e50; margin-bottom: 15px; font-size: 1.2rem;">Recent Transactions</h3>
        <table class="report-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Type</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${ALL_TRANSACTIONS.slice(0, 20).map(transaction => `
              <tr>
                <td>${transaction.timestamp || new Date(transaction.date).toLocaleString()}</td>
                <td><span class="transaction-type ${transaction.type.toLowerCase()}">${transaction.type}</span></td>
                <td>${transaction.category || 'N/A'}</td>
                <td>${transaction.description || 'No description'}</td>
                <td style="color: ${transaction.type === 'Income' ? '#2ecc71' : '#e74c3c'}; font-weight: 600;">
                  ${transaction.type === 'Income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      reportContent.appendChild(tableContainer);
    } else {
      const noTransactions = document.createElement('div');
      noTransactions.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #7f8c8d;">
          <div style="font-size: 3rem; margin-bottom: 20px;">📊</div>
          <h3 style="color: #2c3e50; margin-bottom: 10px;">No Transactions Yet</h3>
          <p>Start by adding income or expenses to see your financial data here.</p>
        </div>
      `;
      reportContent.appendChild(noTransactions);
    }
    
    reportContent.classList.add('show');
    reportContent.scrollIntoView({ behavior: 'smooth' });
  }
}

// REGISTER
async function register() {
  const firstName = document.getElementById("r_fname").value.trim();
  const lastName = document.getElementById("r_lname").value.trim();
  const password = document.getElementById("r_pass").value.trim();
  const initialAmount = document.getElementById("r_amount").value.trim();
  
  if (!firstName || !lastName || !password || !initialAmount) {
    showNotification('error', 'Error', 'Please fill in all registration fields');
    return;
  }

  const amount = parseFloat(initialAmount);
  if (isNaN(amount) || amount < 0) {
    showNotification('error', 'Error', 'Please enter a valid initial amount');
    return;
  }

  const payload = {
    first_name: firstName,
    last_name: lastName,
    password: password,
    total_amount: amount
  };

  const loading = showLoading();
  
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (data.success) {
      showNotification('success', 'Registration Successful', `Account created with $${amount.toFixed(2)}! Please login.`);
      
      document.getElementById("r_fname").value = '';
      document.getElementById("r_lname").value = '';
      document.getElementById("r_pass").value = '';
      document.getElementById("r_amount").value = '';
      
      loginCard.classList.remove('hidden');
      registerCard.classList.add('hidden');
      
      document.getElementById("l_fname").value = firstName;
      document.getElementById("l_lname").value = lastName;
      document.getElementById("l_pass").value = '';
      document.getElementById("l_pass").focus();
      
      showNotification('info', 'Login Ready', 'Login form has been pre-filled. Please enter your password to login.');
      
    } else {
      showNotification('error', 'Registration Failed', data.message || 'Registration failed');
    }
  } catch (error) {
    showNotification('error', 'Network Error', 'Please check your connection and try again');
    console.error("Registration error:", error);
  } finally {
    hideLoading(loading);
  }
}

// LOGIN
async function login() {
  const firstName = document.getElementById("l_fname").value.trim();
  const lastName = document.getElementById("l_lname").value.trim();
  const password = document.getElementById("l_pass").value.trim();
  
  if (!firstName || !lastName || !password) {
    showNotification('error', 'Error', 'Please fill in all login fields');
    return;
  }

  const payload = {
    first_name: firstName,
    last_name: lastName,
    password: password
  };

  const loading = showLoading();
  
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (data.success) {
      USER_ID = data?.data?.id;
      
      if (data?.data) {
        TOTAL_INCOME = parseFloat(data.data.total_amount) || 0;
        TOTAL_EXPENSE = parseFloat(data.data.spent_amount) || 0;
        USER_BALANCE = parseFloat(data.data.remaining_amount) || 0;
      }
      
      updateUserInfo(firstName, lastName, USER_BALANCE);
      updateQuickStatsDisplay();
      showMainContent();
      
      showNotification('success', 'Welcome!', `Hello ${firstName}! Your balance is $${USER_BALANCE.toFixed(2)}.`);
      
    } else {
      showNotification('error', 'Login Failed', data.message || 'Invalid credentials');
    }
  } catch (error) {
    showNotification('error', 'Network Error', 'Please check your connection and try again');
    console.error("Login error:", error);
  } finally {
    hideLoading(loading);
  }
}

// ADD AMOUNT (Income)
async function addAmount() {
  if (!USER_ID) {
    showNotification('error', 'Error', 'Please login first');
    return;
  }

  const amountInput = document.getElementById("amount").value.trim();
  const description = document.getElementById("desc").value.trim();
  
  if (!amountInput || amountInput <= 0) {
    showNotification('error', 'Error', 'Please enter a valid amount');
    return;
  }

  const amount = parseFloat(amountInput);
  if (isNaN(amount) || amount <= 0) {
    showNotification('error', 'Error', 'Please enter a valid positive amount');
    return;
  }

  const loading = showLoading();
  
  try {
    const res = await fetch(`${API_BASE}/add-money`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: USER_NAME.split(' ')[0],
        last_name: USER_NAME.split(' ')[1],
        amount: amount,
        description: description || "Income"
      })
    });

    const data = await res.json();
    
    if (data.success) {
      await updateStatsFromAPI();
      addTransaction('Income', amount, description || 'Income');
      
      document.getElementById("amount").value = '';
      document.getElementById("desc").value = '';
      
      showNotification('success', 'Income Added', `Successfully added $${amount.toFixed(2)} income`);
    } else {
      showNotification('error', 'Error', data.message || 'Failed to add income');
    }
  } catch (error) {
    TOTAL_INCOME += amount;
    USER_BALANCE += amount;
    addTransaction('Income', amount, description || 'Income');
    updateQuickStatsDisplay();
    
    document.getElementById("amount").value = '';
    document.getElementById("desc").value = '';
    
    showNotification('success', 'Income Added (Offline)', `Added $${amount.toFixed(2)} income locally`);
    console.error("Add amount error:", error);
  } finally {
    hideLoading(loading);
  }
}

// ADD EXPENSE
async function addExpense() {
  if (!USER_ID) {
    showNotification('error', 'Error', 'Please login first');
    return;
  }

  const amountInput = document.getElementById("expense-amount").value.trim();
  const category = document.getElementById("category").value;
  const description = document.getElementById("expense-desc").value.trim();
  
  if (!amountInput || amountInput <= 0) {
    showNotification('error', 'Error', 'Please enter a valid amount');
    return;
  }

  const amount = parseFloat(amountInput);
  if (isNaN(amount) || amount <= 0) {
    showNotification('error', 'Error', 'Please enter a valid positive amount');
    return;
  }

  if (amount > USER_BALANCE) {
    showNotification('error', 'Insufficient Balance', 'You do not have enough balance for this expense');
    return;
  }

  const loading = showLoading();
  
  try {
    const res = await fetch(`${API_BASE}/user/${USER_ID}/expense`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amount,
        category: category,
        description: description || "Expense"
      })
    });

    const data = await res.json();
    
    if (data.success) {
      await updateStatsFromAPI();
      addTransaction('Expense', amount, description || 'Expense', category);
      
      document.getElementById("expense-amount").value = '';
      document.getElementById("expense-desc").value = '';
      
      showNotification('success', 'Expense Added', `Successfully added $${amount.toFixed(2)} expense`);
    } else {
      showNotification('error', 'Error', data.message || 'Failed to add expense');
    }
  } catch (error) {
    TOTAL_EXPENSE += amount;
    USER_BALANCE -= amount;
    addTransaction('Expense', amount, description || 'Expense', category);
    updateQuickStatsDisplay();
    
    document.getElementById("expense-amount").value = '';
    document.getElementById("expense-desc").value = '';
    
    showNotification('success', 'Expense Added (Offline)', `Added $${amount.toFixed(2)} expense locally`);
    console.error("Add expense error:", error);
  } finally {
    hideLoading(loading);
  }
}

// QUICK STATS
async function quickStats() {
  if (!USER_ID) {
    showNotification('error', 'Error', 'Please login first');
    return;
  }

  const loading = showLoading();
  
  try {
    const updated = await updateStatsFromAPI();
    
    if (updated) {
      showNotification('success', 'Stats Updated', 'Quick stats have been refreshed from server');
    } else {
      updateQuickStatsDisplay();
      showNotification('info', 'Stats Updated', 'Using local data. Some stats may not be synced.');
    }
  } catch (error) {
    console.error("Quick stats error:", error);
    updateQuickStatsDisplay();
    showNotification('info', 'Stats Updated', 'Using local data. Check your connection.');
  } finally {
    hideLoading(loading);
  }
}

// REPORT
async function getReport() {
  if (!USER_ID) {
    showNotification('error', 'Error', 'Please login first');
    return;
  }

  const loading = showLoading();
  
  try {
    const res = await fetch(`${API_BASE}/report?user_id=${USER_ID}`);
    const data = await res.json();
    
    if (data.success) {
      showReport(data);
      showNotification('success', 'Report Generated', 'Financial report has been generated');
    } else {
      const localReport = {
        data: {
          user: USER_NAME,
          total_income: TOTAL_INCOME,
          total_expense: TOTAL_EXPENSE,
          net_balance: USER_BALANCE,
          expenses: ALL_TRANSACTIONS.filter(t => t.type === 'Expense')
        }
      };
      showReport(localReport);
      showNotification('info', 'Local Report', 'Generated report from local data');
    }
  } catch (error) {
    const localReport = {
      data: {
        user: USER_NAME,
        total_income: TOTAL_INCOME,
        total_expense: TOTAL_EXPENSE,
        net_balance: USER_BALANCE,
        expenses: ALL_TRANSACTIONS.filter(t => t.type === 'Expense')
      }
    };
    showReport(localReport);
    showNotification('info', 'Local Report', 'Generated report from local data (offline mode)');
    console.error("Get report error:", error);
  } finally {
    hideLoading(loading);
  }
}

// PDF Download - Placeholder
async function downloadPDFReport() {
  showNotification('info', 'PDF Feature', 'PDF download feature coming soon!');
}

// LOGOUT
function logout() {
  USER_ID = null;
  USER_NAME = "";
  USER_BALANCE = 0;
  TOTAL_INCOME = 0;
  TOTAL_EXPENSE = 0;
  ALL_TRANSACTIONS = [];
  IS_LOGGED_IN = false;
  
  if (reportContent) {
    reportContent.classList.remove('show');
    reportContent.innerHTML = '';
  }
  
  showAuthSection();
  showNotification('success', 'Logged Out', 'You have been successfully logged out');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('l_fname').focus();
  
  const loginInputs = document.querySelectorAll('#login-card input');
  loginInputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') login();
    });
  });
  
  const registerInputs = document.querySelectorAll('#register-card input');
  registerInputs.forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') register();
    });
  });
  
  document.getElementById('amount').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addAmount();
  });
  
  document.getElementById('desc').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addAmount();
  });
  
  document.getElementById('expense-amount').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addExpense();
  });
  
  document.getElementById('expense-desc').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addExpense();
  });
  
  clearFormFields();
});
