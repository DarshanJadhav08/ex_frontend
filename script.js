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
    primary: [44, 62, 80],    // #2c3e50
    success: [46, 204, 113],  // #2ecc71
    danger: [231, 76, 60],    // #e74c3c
    info: [52, 152, 219],     // #3498db
    warning: [241, 196, 15],  // #f1c40f
    dark: [52, 73, 94],       // #34495e
    light: [236, 240, 241]    // #ecf0f1
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
  // Remove existing notifications
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

  // Auto remove after duration
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
  
  // Update quick stats with initial balance
  updateQuickStatsDisplay();
}

// Update quick stats display
function updateQuickStatsDisplay() {
  // Update all three stats
  document.getElementById('total-income').textContent = `$${TOTAL_INCOME.toFixed(2)}`;
  document.getElementById('total-expense').textContent = `$${TOTAL_EXPENSE.toFixed(2)}`;
  document.getElementById('net-balance').textContent = `$${USER_BALANCE.toFixed(2)}`;
  
  // Also update the current balance in user header
  document.getElementById('current-balance').textContent = USER_BALANCE.toFixed(2);
}

// Store user data locally
function storeUserData() {
  if (!USER_ID || !IS_LOGGED_IN) return;
  
  const userData = {
    userId: USER_ID,
    userName: USER_NAME,
    balance: USER_BALANCE,
    totalIncome: TOTAL_INCOME,
    totalExpense: TOTAL_EXPENSE,
    transactions: ALL_TRANSACTIONS,
    timestamp: Date.now()
  };
  
  localStorage.setItem(`expense_tracker_${USER_ID}`, JSON.stringify(userData));
}

// Load user data from localStorage
function loadUserData() {
  if (!USER_ID) return false;
  
  try {
    const storedData = localStorage.getItem(`expense_tracker_${USER_ID}`);
    if (storedData) {
      const userData = JSON.parse(storedData);
      
      // Check if data is not too old (1 day)
      if ((Date.now() - userData.timestamp) < 86400000) {
        USER_NAME = userData.userName;
        USER_BALANCE = userData.balance || 0;
        TOTAL_INCOME = userData.totalIncome || 0;
        TOTAL_EXPENSE = userData.totalExpense || 0;
        ALL_TRANSACTIONS = userData.transactions || [];
        
        // Update UI
        const firstName = USER_NAME.split(' ')[0];
        document.getElementById('user-name').textContent = `Welcome, ${firstName}`;
        updateQuickStatsDisplay();
        
        return true;
      }
    }
  } catch (e) {
    console.error("Error loading user data:", e);
  }
  
  return false;
}

// Clear user data from localStorage on logout
function clearUserData() {
  if (USER_ID) {
    localStorage.removeItem(`expense_tracker_${USER_ID}`);
  }
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
  
  ALL_TRANSACTIONS.unshift(transaction); // Add to beginning
  
  // Keep only last 50 transactions
  if (ALL_TRANSACTIONS.length > 50) {
    ALL_TRANSACTIONS = ALL_TRANSACTIONS.slice(0, 50);
  }
  
  // Don't call storeUserData here - it causes issues
  // storeUserData();
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
        
        // Update ALL totals from API
        TOTAL_INCOME = parseFloat(data.total_amount) || 0;
        TOTAL_EXPENSE = parseFloat(data.spent_amount) || 0;
        USER_BALANCE = parseFloat(data.remaining_amount) || 0;
        
        // Update all displays
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
    
    // Calculate totals for display
    const totalIncome = parseFloat(data.total_income) || TOTAL_INCOME;
    const totalExpense = parseFloat(data.total_expense) || TOTAL_EXPENSE;
    const netBalance = totalIncome - totalExpense;
    
    // Create summary section
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
    
    // Add PDF download button inside report
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
    
    // Show transactions from ALL_TRANSACTIONS
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
      // Store the initial amount locally
      localStorage.setItem('last_registered_amount', amount.toString());
      localStorage.setItem('last_registered_user', JSON.stringify({
        firstName: firstName,
        lastName: lastName,
        amount: amount,
        timestamp: Date.now()
      }));
      
      showNotification('success', 'Registration Successful', `Account created with $${amount.toFixed(2)}! Please login.`);
      
      // Clear registration form
      document.getElementById("r_fname").value = '';
      document.getElementById("r_lname").value = '';
      document.getElementById("r_pass").value = '';
      document.getElementById("r_amount").value = '';
      
      // Switch to login card
      loginCard.classList.remove('hidden');
      registerCard.classList.add('hidden');
      
      // Pre-fill login form with registered credentials
      document.getElementById("l_fname").value = firstName;
      document.getElementById("l_lname").value = lastName;
      // Don't pre-fill password for security
      document.getElementById("l_pass").value = '';
      
      // Set focus to password field
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

// LOGIN - Fixed: Loads data from localStorage if available
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
      
      // Get user data from API response
      let totalAmount = 0;
      let spentAmount = 0;
      let remainingAmount = 0;
      
      if (data?.data) {
        totalAmount = parseFloat(data.data.total_amount) || 0;
        spentAmount = parseFloat(data.data.expense_amount) || 0;
        remainingAmount = parseFloat(data.data.remaining_amount) || 0;
      }
      
      // Set values from API
      TOTAL_INCOME = totalAmount;
      TOTAL_EXPENSE = spentAmount;
      USER_BALANCE = remainingAmount;
      
      // Clear localStorage
      if (USER_ID) {
        localStorage.removeItem(`expense_tracker_${USER_ID}`);
      }
      
      // Update UI
      updateUserInfo(firstName, lastName, USER_BALANCE);
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

  const payload = {
    amount: amount,
    description: description || "Income"
  };

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
      
      // Update all displays
      document.getElementById('current-balance').textContent = USER_BALANCE.toFixed(2);
      updateQuickStatsDisplay();
      
      // Clear form
      document.getElementById("amount").value = '';
      document.getElementById("desc").value = '';
      
      showNotification('success', 'Income Added', `Successfully added $${amount.toFixed(2)} income`);
    } else {
      showNotification('error', 'Error', data.message || 'Failed to add income');
    }
  } catch (error) {
    // Fallback: Update locally even if API fails
    TOTAL_INCOME += amount;
    USER_BALANCE += amount;
    addTransaction('Income', amount, description || 'Income');
    document.getElementById('current-balance').textContent = USER_BALANCE.toFixed(2);
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

  const payload = {
    amount: amount,
    category: category,
    description: description || "Expense"
  };

  const loading = showLoading();
  
  try {
    const res = await fetch(`${API_BASE}/user/${USER_ID}/expense`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (data.success) {
      await updateStatsFromAPI();
      addTransaction('Expense', amount, description || 'Expense', category);
      
      // Update all displays
      document.getElementById('current-balance').textContent = USER_BALANCE.toFixed(2);
      updateQuickStatsDisplay();
      
      // Clear form
      document.getElementById("expense-amount").value = '';
      document.getElementById("expense-desc").value = '';
      
      showNotification('success', 'Expense Added', `Successfully added $${amount.toFixed(2)} expense`);
    } else {
      showNotification('error', 'Error', data.message || 'Failed to add expense');
    }
  } catch (error) {
    // Fallback: Update locally even if API fails
    TOTAL_EXPENSE += amount;
    USER_BALANCE -= amount;
    addTransaction('Expense', amount, description || 'Expense', category);
    document.getElementById('current-balance').textContent = USER_BALANCE.toFixed(2);
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
      // If API fails, update with local data
      updateQuickStatsDisplay();
      showNotification('info', 'Stats Updated', 'Using local data. Some stats may not be synced.');
    }
  } catch (error) {
    console.error("Quick stats error:", error);
    
    // Fallback: Use local data
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
https://expense-backend-9.onrender.com    const data = await res.json();
    
    if (data.success) {
      showReport(data);
      showNotification('success', 'Report Generated', 'Financial report has been generated');
    } else {
      // Create a local report if API fails
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
    // Create a local report on network error
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

// ENHANCED PDF DOWNLOAD FUNCTION - Interactive and Proper
async function downloadPDFReport() {
  if (!USER_ID) {
    showNotification('error', 'Error', 'Please login first');
    return;
  }

  // Check if jsPDF is loaded
  if (typeof window.jspdf === 'undefined') {
    showNotification('error', 'PDF Error', 'PDF library not loaded. Please refresh the page.');
    return;
  }

  const loading = showLoading();
  
  try {
    // Show interactive options before generating PDF
    const pdfType = await showPDFOptions();
    
    if (!pdfType) {
      hideLoading(loading);
      return; // User cancelled
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(PDF_CONFIG.orientation, 'mm', PDF_CONFIG.pageSize);
    
    const now = new Date();
    const reportDate = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const reportTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const pageWidth = doc.internal.pageSize.width;
    const leftMargin = PDF_CONFIG.margins.left;
    const rightMargin = pageWidth - PDF_CONFIG.margins.right;
    
    // Helper function to set colors
    const setColor = (color) => {
      doc.setTextColor(color[0], color[1], color[2]);
    };
    
    // Helper function to draw horizontal line
    const drawLine = (y) => {
      doc.setDrawColor(200, 200, 200);
      doc.line(leftMargin, y, rightMargin, y);
    };
    
    // Header Section
    doc.setFontSize(24);
    setColor(PDF_CONFIG.colors.primary);
    doc.text('Expense Tracker', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(14);
    setColor(PDF_CONFIG.colors.dark);
    doc.text('Financial Report', pageWidth / 2, 35, { align: 'center' });
    
    // Report info
    doc.setFontSize(10);
    setColor([100, 100, 100]);
    doc.text(`Generated: ${reportDate} at ${reportTime}`, pageWidth / 2, 42, { align: 'center' });
    doc.text(`Report Type: ${pdfType}`, pageWidth / 2, 48, { align: 'center' });
    
    drawLine(52);
    
    let yPos = 60;
    
    // User Information
    doc.setFontSize(12);
    setColor(PDF_CONFIG.colors.primary);
    doc.text('User Information', leftMargin, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    setColor([0, 0, 0]);
    doc.text(`Name: ${USER_NAME}`, leftMargin + 5, yPos);
    yPos += 6;
    doc.text(`User ID: ${USER_ID}`, leftMargin + 5, yPos);
    yPos += 6;
    doc.text(`Report Period: ${getReportPeriod()}`, leftMargin + 5, yPos);
    
    yPos += 15;
    drawLine(yPos);
    yPos += 10;
    
    // Financial Summary
    doc.setFontSize(12);
    setColor(PDF_CONFIG.colors.primary);
    doc.text('Financial Summary', leftMargin, yPos);
    
    yPos += 15;
    
    // Create summary table
    const summaryData = [
      { label: 'Total Income', value: `$${TOTAL_INCOME.toFixed(2)}`, color: PDF_CONFIG.colors.success },
      { label: 'Total Expenses', value: `$${TOTAL_EXPENSE.toFixed(2)}`, color: PDF_CONFIG.colors.danger },
      { label: 'Current Balance', value: `$${USER_BALANCE.toFixed(2)}`, color: PDF_CONFIG.colors.info },
      { label: 'Net Balance (Income - Expenses)', value: `$${(TOTAL_INCOME - TOTAL_EXPENSE).toFixed(2)}`, color: PDF_CONFIG.colors.warning }
    ];
    
    summaryData.forEach((item, index) => {
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(leftMargin, yPos - 3, pageWidth - leftMargin - rightMargin, 8, 'F');
      }
      
      doc.setFontSize(10);
      setColor([0, 0, 0]);
      doc.text(item.label, leftMargin + 5, yPos);
      
      setColor(item.color);
      doc.text(item.value, rightMargin - 5, yPos, { align: 'right' });
      
      yPos += 8;
    });
    
    yPos += 10;
    drawLine(yPos);
    yPos += 10;
    
    // Expense Breakdown by Category (if there are expenses)
    if (TOTAL_EXPENSE > 0 && ALL_TRANSACTIONS.some(t => t.type === 'Expense')) {
      doc.setFontSize(12);
      setColor(PDF_CONFIG.colors.primary);
      doc.text('Expense Breakdown by Category', leftMargin, yPos);
      
      yPos += 10;
      
      // Calculate category totals
      const categoryTotals = {};
      ALL_TRANSACTIONS.filter(t => t.type === 'Expense').forEach(t => {
        const category = t.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
      });
      
      // Sort categories by amount (descending)
      const sortedCategories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
      
      sortedCategories.forEach((category, index) => {
        const amount = categoryTotals[category];
        const percentage = ((amount / TOTAL_EXPENSE) * 100).toFixed(1);
        
        doc.setFontSize(10);
        setColor([0, 0, 0]);
        doc.text(`${category}`, leftMargin + 5, yPos);
        
        // Draw percentage bar
        const barWidth = 60;
        const barHeight = 4;
        const fillWidth = (percentage / 100) * barWidth;
        
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(220, 220, 220);
        doc.rect(rightMargin - barWidth - 40, yPos - 3, barWidth, barHeight, 'FD');
        
        doc.setFillColor(PDF_CONFIG.colors.danger[0], PDF_CONFIG.colors.danger[1], PDF_CONFIG.colors.danger[2]);
        doc.rect(rightMargin - barWidth - 40, yPos - 3, fillWidth, barHeight, 'F');
        
        setColor(PDF_CONFIG.colors.danger);
        doc.text(`$${amount.toFixed(2)} (${percentage}%)`, rightMargin - 5, yPos, { align: 'right' });
        
        yPos += 8;
      });
      
      yPos += 10;
      drawLine(yPos);
      yPos += 10;
    }
    
    // Add transactions based on report type
    if (ALL_TRANSACTIONS.length > 0) {
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(12);
      setColor(PDF_CONFIG.colors.primary);
      doc.text('Transaction History', leftMargin, yPos);
      
      yPos += 10;
      
      // Filter transactions based on report type
      let filteredTransactions = ALL_TRANSACTIONS;
      if (pdfType === 'Income Only') {
        filteredTransactions = ALL_TRANSACTIONS.filter(t => t.type === 'Income');
      } else if (pdfType === 'Expenses Only') {
        filteredTransactions = ALL_TRANSACTIONS.filter(t => t.type === 'Expense');
      }
      
      // Table header
      doc.setFillColor(PDF_CONFIG.colors.primary[0], PDF_CONFIG.colors.primary[1], PDF_CONFIG.colors.primary[2]);
      doc.rect(leftMargin, yPos, pageWidth - leftMargin - rightMargin, 8, 'F');
      
      setColor([255, 255, 255]);
      doc.setFontSize(9);
      doc.text('Date', leftMargin + 5, yPos + 5);
      doc.text('Type', leftMargin + 40, yPos + 5);
      doc.text('Category', leftMargin + 60, yPos + 5);
      doc.text('Description', leftMargin + 90, yPos + 5);
      doc.text('Amount', rightMargin - 5, yPos + 5, { align: 'right' });
      
      yPos += 12;
      
      // Table rows
      filteredTransactions.slice(0, 30).forEach((transaction, index) => {
        // Alternate row background
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(leftMargin, yPos - 3, pageWidth - leftMargin - rightMargin, 8, 'F');
        }
        
        // Date (short format)
        const date = transaction.timestamp ? 
          transaction.timestamp.split(',')[0] : 
          new Date(transaction.date).toLocaleDateString();
        
        doc.setFontSize(8);
        setColor([0, 0, 0]);
        doc.text(date.substring(0, 10), leftMargin + 5, yPos);
        
        // Type
        doc.text(transaction.type, leftMargin + 40, yPos);
        
        // Category
        doc.text(transaction.category || '-', leftMargin + 60, yPos);
        
        // Description (truncated)
        const desc = transaction.description || 'No description';
        doc.text(desc.substring(0, 25), leftMargin + 90, yPos);
        
        // Amount with color
        if (transaction.type === 'Income') {
          setColor(PDF_CONFIG.colors.success);
          doc.text(`+$${transaction.amount.toFixed(2)}`, rightMargin - 5, yPos, { align: 'right' });
        } else {
          setColor(PDF_CONFIG.colors.danger);
          doc.text(`-$${transaction.amount.toFixed(2)}`, rightMargin - 5, yPos, { align: 'right' });
        }
        
        yPos += 7;
        
        // Check for page break
        if (yPos > 270 && index < filteredTransactions.length - 1) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      // Add summary at the end
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(12);
      setColor(PDF_CONFIG.colors.primary);
      doc.text('Report Summary & Insights', leftMargin, yPos);
      
      yPos += 15;
      
      // Add insights based on data
      const insights = generateInsights();
      doc.setFontSize(10);
      setColor([0, 0, 0]);
      
      insights.forEach(insight => {
        doc.text(`• ${insight}`, leftMargin + 5, yPos);
        yPos += 7;
      });
      
      yPos += 10;
      drawLine(yPos);
      yPos += 10;
      
      // Footer note
      doc.setFontSize(9);
      setColor([150, 150, 150]);
      doc.text('This report was generated by Expense Tracker Pro', pageWidth / 2, 280, { align: 'center' });
      doc.text('For any discrepancies, contact support@expensetracker.com', pageWidth / 2, 285, { align: 'center' });
    }
    
    // Generate filename with timestamp
    const timestamp = now.getFullYear() + 
                     ('0' + (now.getMonth() + 1)).slice(-2) + 
                     ('0' + now.getDate()).slice(-2) + 
                     '_' + 
                     ('0' + now.getHours()).slice(-2) + 
                     ('0' + now.getMinutes()).slice(-2);
    
    const fileName = `Expense_Report_${USER_NAME.replace(/\s+/g, '_')}_${timestamp}.pdf`;
    
    // Save the PDF
    doc.save(fileName);
    
    showNotification('success', 'PDF Downloaded', `${pdfType} report has been downloaded successfully!`);
    
    // Log download event
    console.log(`PDF Report Downloaded: ${fileName}`);
    
  } catch (error) {
    console.error("PDF generation error:", error);
    showNotification('error', 'PDF Error', 'Failed to generate PDF. Please try again.');
  } finally {
    hideLoading(loading);
  }
}

// Interactive PDF Options Dialog
function showPDFOptions() {
  return new Promise((resolve) => {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 30px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      animation: slideUp 0.3s ease;
    `;
    
    modalContent.innerHTML = `
      <h2 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">📊 PDF Report Options</h2>
      
      <div style="margin-bottom: 25px;">
        <h3 style="color: #34495e; margin-bottom: 15px; font-size: 1.1rem;">Select Report Type:</h3>
        
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <label style="display: flex; align-items: center; padding: 12px; border-radius: 8px; border: 2px solid #e0e0e0; cursor: pointer; transition: all 0.3s;">
            <input type="radio" name="pdfType" value="Complete Report" checked style="margin-right: 10px;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #2c3e50;">Complete Report</div>
              <div style="font-size: 0.9em; color: #7f8c8d;">All transactions with summaries</div>
            </div>
            <div style="color: #3498db;">📋</div>
          </label>
          
          <label style="display: flex; align-items: center; padding: 12px; border-radius: 8px; border: 2px solid #e0e0e0; cursor: pointer; transition: all 0.3s;">
            <input type="radio" name="pdfType" value="Income Only" style="margin-right: 10px;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #2c3e50;">Income Only</div>
              <div style="font-size: 0.9em; color: #7f8c8d;">Only income transactions</div>
            </div>
            <div style="color: #2ecc71;">💰</div>
          </label>
          
          <label style="display: flex; align-items: center; padding: 12px; border-radius: 8px; border: 2px solid #e0e0e0; cursor: pointer; transition: all 0.3s;">
            <input type="radio" name="pdfType" value="Expenses Only" style="margin-right: 10px;">
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #2c3e50;">Expenses Only</div>
              <div style="font-size: 0.9em; color: #7f8c8d;">Only expense transactions</div>
            </div>
            <div style="color: #e74c3c;">💸</div>
          </label>
        </div>
      </div>
      
      <div style="display: flex; gap: 10px;">
        <button id="cancelPdfBtn" style="flex: 1; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; background: white; color: #7f8c8d; font-weight: 600; cursor: pointer; transition: all 0.3s;">
          Cancel
        </button>
        <button id="generatePdfBtn" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: #3498db; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s;">
          Generate PDF
        </button>
      </div>
    `;
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Add hover effects
    const labels = modalContent.querySelectorAll('label');
    labels.forEach(label => {
      label.addEventListener('mouseenter', () => {
        label.style.borderColor = '#3498db';
        label.style.background = '#f8f9fa';
      });
      label.addEventListener('mouseleave', () => {
        const input = label.querySelector('input');
        if (!input.checked) {
          label.style.borderColor = '#e0e0e0';
          label.style.background = 'white';
        }
      });
      
      // Update style when selected
      const input = label.querySelector('input');
      input.addEventListener('change', function() {
        labels.forEach(l => {
          l.style.borderColor = '#e0e0e0';
          l.style.background = 'white';
        });
        if (this.checked) {
          label.style.borderColor = '#3498db';
          label.style.background = '#f0f7ff';
        }
      });
    });
    
    // Set initial checked style
    const checkedLabel = modalContent.querySelector('input[checked]').closest('label');
    checkedLabel.style.borderColor = '#3498db';
    checkedLabel.style.background = '#f0f7ff';
    
    // Button event listeners
    modalContent.querySelector('#cancelPdfBtn').addEventListener('click', () => {
      document.body.removeChild(modalOverlay);
      resolve(null);
    });
    
    modalContent.querySelector('#generatePdfBtn').addEventListener('click', () => {
      const selectedType = modalContent.querySelector('input[name="pdfType"]:checked').value;
      document.body.removeChild(modalOverlay);
      resolve(selectedType);
    });
    
    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        document.body.removeChild(modalOverlay);
        resolve(null);
      }
    });
    
    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  });
}

// Helper function to get report period
function getReportPeriod() {
  if (ALL_TRANSACTIONS.length === 0) {
    return 'No transactions yet';
  }
  
  const dates = ALL_TRANSACTIONS.map(t => new Date(t.date));
  const oldest = new Date(Math.min(...dates));
  const newest = new Date(Math.max(...dates));
  
  return `${oldest.toLocaleDateString()} - ${newest.toLocaleDateString()}`;
}

// Helper function to generate insights
function generateInsights() {
  const insights = [];
  
  // Balance insights
  if (USER_BALANCE < 0) {
    insights.push('⚠️ Warning: Your balance is negative. Consider reducing expenses.');
  } else if (USER_BALANCE < 100) {
    insights.push('💰 Low balance alert: Consider adding more income.');
  }
  
  // Expense insights
  if (TOTAL_EXPENSE > 0) {
    const expenseRatio = (TOTAL_EXPENSE / TOTAL_INCOME) * 100;
    
    if (expenseRatio > 80) {
      insights.push('💸 High expense ratio: You\'re spending more than 80% of your income.');
    } else if (expenseRatio < 30) {
      insights.push('✅ Good savings rate: You\'re saving more than 70% of your income.');
    }
    
    // Category insights
    const categoryTotals = {};
    ALL_TRANSACTIONS.filter(t => t.type === 'Expense').forEach(t => {
      const category = t.category || 'Uncategorized';
      categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
    });
    
    const maxCategory = Object.keys(categoryTotals).reduce((a, b) => 
      categoryTotals[a] > categoryTotals[b] ? a : b
    );
    
    if (categoryTotals[maxCategory]) {
      const percentage = ((categoryTotals[maxCategory] / TOTAL_EXPENSE) * 100).toFixed(1);
      insights.push(`📊 Highest spending category: ${maxCategory} (${percentage}% of expenses)`);
    }
  }
  
  // Transaction frequency
  if (ALL_TRANSACTIONS.length > 10) {
    const avgPerDay = ALL_TRANSACTIONS.length / 30; // Assuming last 30 days
    if (avgPerDay > 2) {
      insights.push('📈 Active user: You average more than 2 transactions per day.');
    }
  }
  
  // Add default insight if none generated
  if (insights.length === 0) {
    insights.push('📋 Keep tracking your finances regularly for better insights.');
  }
  
  return insights;
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
  
  // Clear stored registration data
  localStorage.removeItem('last_registered_user');
  
  // Hide report content
  if (reportContent) {
    reportContent.classList.remove('show');
    reportContent.innerHTML = '';
  }
  
  showAuthSection();
  showNotification('success', 'Logged Out', 'You have been successfully logged out');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  // Set focus on first name field in login
  document.getElementById('l_fname').focus();
  
  // Add enter key support for forms
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
  
  // Add enter key support for income/expense forms
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
  
  // Clear form fields on page load
  clearFormFields();
  
  // Check for PDF library
  if (typeof window.jspdf === 'undefined') {
    console.warn('jsPDF library not loaded. PDF download may not work.');
  }
});
