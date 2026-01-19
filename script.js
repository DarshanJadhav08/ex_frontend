const API_BASE = "https://ex-branch.onrender.com";

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
    info: 'ℹ️'
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
  
  // Store updated data
  storeUserData();
}

// Update stats from API response
async function updateStatsFromAPI() {
  if (!USER_ID) return;

  const loading = showLoading();
  
  try {
    // Fetch quick stats
    const statsRes = await fetch(`${API_BASE}/quick-stats/${USER_ID}`);
    
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      
      if (statsData && statsData.data) {
        const data = statsData.data;
        
        // Update totals from API
        TOTAL_INCOME = parseFloat(data.total_income) || TOTAL_INCOME;
        TOTAL_EXPENSE = parseFloat(data.total_expense) || TOTAL_EXPENSE;
        
        // Calculate net balance
        USER_BALANCE = TOTAL_INCOME - TOTAL_EXPENSE;
        
        // Update all displays
        document.getElementById('current-balance').textContent = USER_BALANCE.toFixed(2);
        updateQuickStatsDisplay();
        
        // Store updated data
        storeUserData();
        
        return true;
      }
    }
  } catch (error) {
    console.error("Update stats error:", error);
  } finally {
    hideLoading(loading);
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
    `;
    
    reportContent.appendChild(summary);
    
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
                <td>${transaction.type}</td>
                <td>${transaction.category || 'N/A'}</td>
                <td>${transaction.description || 'No description'}</td>
                <td style="color: ${transaction.type === 'Income' ? '#2ecc71' : '#e74c3c'};">
                  ${transaction.type === 'Income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      
      reportContent.appendChild(tableContainer);
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
    initial_amount: amount
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
      
      // Try to get initial amount from multiple sources
      let initialAmount = 0;
      
      // 1. First try API response
      if (data?.data?.initial_amount !== undefined && data?.data?.initial_amount !== null) {
        initialAmount = parseFloat(data.data.initial_amount) || 0;
      } 
      // 2. Check if this was a recent registration
      else {
        try {
          const lastReg = localStorage.getItem('last_registered_user');
          if (lastReg) {
            const regData = JSON.parse(lastReg);
            if (regData.firstName === firstName && regData.lastName === lastName) {
              initialAmount = regData.amount || 0;
              // Clear this temporary storage
              localStorage.removeItem('last_registered_user');
            }
          }
        } catch (e) {
          console.error("Error checking last registration:", e);
        }
      }
      
      // 3. Load data from localStorage if user has been here before
      const hasLocalData = loadUserData();
      
      if (!hasLocalData) {
        // No local data, use initial amount from registration/login
        TOTAL_INCOME = initialAmount;
        TOTAL_EXPENSE = 0;
        USER_BALANCE = initialAmount;
        
        // Add initial transaction if amount > 0
        if (initialAmount > 0) {
          addTransaction('Initial Deposit', initialAmount, 'Account opening balance');
        }
      }
      
      // Update user info display
      updateUserInfo(firstName, lastName, USER_BALANCE);
      showMainContent();
      
      // Store data for future sessions
      storeUserData();
      
      showNotification('success', 'Welcome!', `Hello ${firstName}! Your balance is $${USER_BALANCE.toFixed(2)}.`);
      
      // Try to sync with server for accurate stats
      setTimeout(async () => {
        try {
          await updateStatsFromAPI();
        } catch (error) {
          console.log("Background stats sync failed, using local data");
        }
      }, 1000);
      
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
    const res = await fetch(`${API_BASE}/add-amount/${USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (data.success) {
      // Update totals
      TOTAL_INCOME += amount;
      USER_BALANCE += amount;
      
      // Add transaction
      addTransaction('Income', amount, description || 'Income');
      
      // Update all displays
      document.getElementById('current-balance').textContent = USER_BALANCE.toFixed(2);
      updateQuickStatsDisplay();
      
      // Clear form
      document.getElementById("amount").value = '';
      document.getElementById("desc").value = '';
      
      // Store updated data
      storeUserData();
      
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
    
    // Store updated data
    storeUserData();
    
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
    const res = await fetch(`${API_BASE}/add-expense/${USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (data.success) {
      // Update totals
      TOTAL_EXPENSE += amount;
      USER_BALANCE -= amount;
      
      // Add transaction
      addTransaction('Expense', amount, description || 'Expense', category);
      
      // Update all displays
      document.getElementById('current-balance').textContent = USER_BALANCE.toFixed(2);
      updateQuickStatsDisplay();
      
      // Clear form
      document.getElementById("expense-amount").value = '';
      document.getElementById("expense-desc").value = '';
      
      // Store updated data
      storeUserData();
      
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
    
    // Store updated data
    storeUserData();
    
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
    const res = await fetch(`${API_BASE}/report/${USER_ID}`);
    const data = await res.json();
    
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

// DOWNLOAD PDF REPORT - FIXED: Works even if server PDF has 502 error
function downloadPDFReport() {
  if (!USER_ID) {
    showNotification('error', 'Error', 'Please login first');
    return;
  }

  const loading = showLoading();
  
  try {
    // Create PDF using jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const now = new Date();
    const reportDate = now.toLocaleDateString();
    const reportTime = now.toLocaleTimeString();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text('Expense Tracker Report', 105, 20, { align: 'center' });
    
    // Report info
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${reportDate} ${reportTime}`, 105, 30, { align: 'center' });
    doc.text(`User: ${USER_NAME}`, 105, 37, { align: 'center' });
    doc.text(`User ID: ${USER_ID}`, 105, 44, { align: 'center' });
    
    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 50, 190, 50);
    
    // Financial Summary
    doc.setFontSize(16);
    doc.setTextColor(44, 62, 80);
    doc.text('Financial Summary', 20, 60);
    
    let yPos = 70;
    
    // Summary table
    doc.setFillColor(52, 152, 219);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('Description', 25, yPos + 7);
    doc.text('Amount', 160, yPos + 7, { align: 'right' });
    
    yPos += 15;
    
    // Income row
    doc.setFillColor(240, 255, 240);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text('Total Income', 25, yPos + 7);
    doc.setTextColor(46, 204, 113);
    doc.text(`$${TOTAL_INCOME.toFixed(2)}`, 160, yPos + 7, { align: 'right' });
    
    yPos += 15;
    
    // Expense row
    doc.setFillColor(255, 240, 240);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text('Total Expenses', 25, yPos + 7);
    doc.setTextColor(231, 76, 60);
    doc.text(`$${TOTAL_EXPENSE.toFixed(2)}`, 160, yPos + 7, { align: 'right' });
    
    yPos += 15;
    
    // Balance row
    doc.setFillColor(240, 240, 255);
    doc.rect(20, yPos, 170, 10, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text('Current Balance', 25, yPos + 7);
    doc.setTextColor(52, 152, 219);
    doc.text(`$${USER_BALANCE.toFixed(2)}`, 160, yPos + 7, { align: 'right' });
    
    yPos += 25;
    
    // Transactions if available
    if (ALL_TRANSACTIONS.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(44, 62, 80);
      doc.text('Transaction History', 20, 20);
      
      yPos = 35;
      
      // Table header
      doc.setFillColor(52, 152, 219);
      doc.rect(20, yPos, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('Date', 25, yPos + 7);
      doc.text('Type', 55, yPos + 7);
      doc.text('Category', 85, yPos + 7);
      doc.text('Description', 120, yPos + 7);
      doc.text('Amount', 165, yPos + 7, { align: 'right' });
      
      yPos += 15;
      
      // Table rows
      for (let i = 0; i < Math.min(ALL_TRANSACTIONS.length, 25); i++) {
        const transaction = ALL_TRANSACTIONS[i];
        
        // Alternate row colors
        if (i % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(20, yPos, 170, 10, 'F');
        }
        
        doc.setTextColor(0, 0, 0);
        
        // Date
        const date = transaction.timestamp ? 
          transaction.timestamp.split(',')[0] : 
          new Date(transaction.date).toLocaleDateString();
        doc.text(date.substring(0, 10), 25, yPos + 7);
        
        // Type
        doc.text(transaction.type, 55, yPos + 7);
        
        // Category
        doc.text(transaction.category || '-', 85, yPos + 7);
        
        // Description (truncate)
        const desc = transaction.description || 'No description';
        doc.text(desc.substring(0, 20), 120, yPos + 7);
        
        // Amount with color
        if (transaction.type === 'Income') {
          doc.setTextColor(46, 204, 113);
          doc.text(`+$${transaction.amount.toFixed(2)}`, 165, yPos + 7, { align: 'right' });
        } else {
          doc.setTextColor(231, 76, 60);
          doc.text(`-$${transaction.amount.toFixed(2)}`, 165, yPos + 7, { align: 'right' });
        }
        
        yPos += 12;
        
        // Check for page break
        if (yPos > 270 && i < ALL_TRANSACTIONS.length - 1) {
          doc.addPage();
          yPos = 20;
        }
      }
    }
    
    // Save the PDF
    const fileName = `Expense_Report_${USER_NAME.replace(/\s+/g, '_')}_${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}.pdf`;
    doc.save(fileName);
    
    showNotification('success', 'PDF Downloaded', 'Report has been downloaded successfully!');
    
  } catch (error) {
    console.error("PDF generation error:", error);
    showNotification('error', 'PDF Error', 'Failed to generate PDF. Please try again.');
  } finally {
    hideLoading(loading);
  }
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
  
  // Clear form fields on page load
  clearFormFields();
});
