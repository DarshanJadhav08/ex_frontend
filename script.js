const API_BASE = "https://ex-branch.onrender.com";

let USER_ID = null;
let USER_NAME = "";
let USER_BALANCE = 0;

// DOM Elements
const authSection = document.getElementById('auth-section');
const mainContent = document.getElementById('main-content');
const loginCard = document.getElementById('login-card');
const registerCard = document.getElementById('register-card');
const reportSection = document.getElementById('report-section');
const outputSection = document.getElementById('output-section');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

// Toggle between login and register cards
showRegisterLink.addEventListener('click', () => {
  loginCard.classList.add('hidden');
  registerCard.classList.remove('hidden');
});

showLoginLink.addEventListener('click', () => {
  registerCard.classList.add('hidden');
  loginCard.classList.remove('hidden');
});

// Helper function to display API responses
const output = (data) => {
  document.getElementById("output").textContent = JSON.stringify(data, null, 2);
  outputSection.classList.remove('hidden');
  outputSection.classList.add('show');
  
  // Scroll to output
  outputSection.scrollIntoView({ behavior: 'smooth' });
};

// Clear output
function clearOutput() {
  document.getElementById("output").textContent = "";
  outputSection.classList.add('hidden');
}

// Show main content after login
function showMainContent() {
  authSection.style.display = 'none';
  mainContent.classList.remove('hidden');
  mainContent.classList.add('show');
}

// Show auth section after logout
function showAuthSection() {
  mainContent.classList.add('hidden');
  mainContent.classList.remove('show');
  authSection.style.display = 'flex';
  loginCard.classList.remove('hidden');
  registerCard.classList.add('hidden');
  
  // Reset form fields
  document.getElementById('l_fname').value = '';
  document.getElementById('l_lname').value = '';
  document.getElementById('l_pass').value = '';
}

// Update user info in UI
function updateUserInfo(firstName, lastName, balance) {
  USER_NAME = `${firstName} ${lastName}`;
  USER_BALANCE = balance;
  
  document.getElementById('user-name').textContent = `Welcome, ${firstName}`;
  document.getElementById('current-balance').textContent = balance;
}

// Update stats in UI
function updateStats(statsData) {
  if (statsData && statsData.data) {
    const data = statsData.data;
    document.getElementById('total-income').textContent = `$${data.total_income || 0}`;
    document.getElementById('total-expense').textContent = `$${data.total_expense || 0}`;
    document.getElementById('net-balance').textContent = `$${data.net_balance || 0}`;
  }
}

// Show report in UI
function showReport(reportData) {
  if (reportData && reportData.data) {
    const data = reportData.data;
    const reportContent = document.getElementById('report-content');
    
    let reportHTML = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #2c3e50; margin-bottom: 10px;">Financial Summary</h3>
        <p><strong>User:</strong> ${data.user || USER_NAME}</p>
        <p><strong>Total Income:</strong> <span style="color: #2ecc71;">$${data.total_income || 0}</span></p>
        <p><strong>Total Expenses:</strong> <span style="color: #e74c3c;">$${data.total_expense || 0}</span></p>
        <p><strong>Net Balance:</strong> <span style="color: #3498db;">$${data.net_balance || 0}</span></p>
      </div>
    `;
    
    if (data.expenses && data.expenses.length > 0) {
      reportHTML += `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #2c3e50; margin-bottom: 10px;">Recent Expenses</h3>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Date</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Category</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Amount</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      // Show only last 5 expenses for brevity
      const recentExpenses = data.expenses.slice(0, 5);
      recentExpenses.forEach(expense => {
        reportHTML += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(expense.timestamp).toLocaleDateString()}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${expense.category || 'N/A'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${expense.description || 'No description'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; color: #e74c3c;">$${expense.amount || 0}</td>
          </tr>
        `;
      });
      
      reportHTML += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
    
    reportContent.innerHTML = reportHTML;
    reportSection.classList.remove('hidden');
    reportSection.classList.add('show');
    
    // Scroll to report
    reportSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// REGISTER
async function register() {
  const firstName = document.getElementById("r_fname").value;
  const lastName = document.getElementById("r_lname").value;
  const password = document.getElementById("r_pass").value;
  const initialAmount = document.getElementById("r_amount").value;
  
  if (!firstName || !lastName || !password || !initialAmount) {
    alert("Please fill in all registration fields");
    return;
  }

  const payload = {
    first_name: firstName,
    last_name: lastName,
    password: password,
    initial_amount: Number(initialAmount)
  };

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    output(data);
    
    if (data.success) {
      // Auto login after registration
      document.getElementById("l_fname").value = firstName;
      document.getElementById("l_lname").value = lastName;
      document.getElementById("l_pass").value = password;
      await login();
    }
  } catch (error) {
    output({ error: "Network error. Please try again." });
  }
}

// LOGIN
async function login() {
  const firstName = document.getElementById("l_fname").value;
  const lastName = document.getElementById("l_lname").value;
  const password = document.getElementById("l_pass").value;
  
  if (!firstName || !lastName || !password) {
    alert("Please fill in all login fields");
    return;
  }

  const payload = {
    first_name: firstName,
    last_name: lastName,
    password: password
  };

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    output(data);
    
    if (data.success) {
      USER_ID = data?.data?.id;
      updateUserInfo(firstName, lastName, data?.data?.initial_amount || 0);
      showMainContent();
      
      // Load quick stats after login
      await quickStats();
    }
  } catch (error) {
    output({ error: "Network error. Please try again." });
  }
}

// ADD AMOUNT (Income)
async function addAmount() {
  if (!USER_ID) return alert("Please login first");

  const amount = document.getElementById("amount").value;
  const description = document.getElementById("desc").value;
  
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount");
    return;
  }

  const payload = {
    amount: Number(amount),
    description: description || "Income"
  };

  try {
    const res = await fetch(`${API_BASE}/add-amount/${USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    output(data);
    
    if (data.success) {
      // Update balance
      USER_BALANCE += Number(amount);
      document.getElementById('current-balance').textContent = USER_BALANCE;
      
      // Clear form
      document.getElementById("amount").value = '';
      document.getElementById("desc").value = '';
      
      // Refresh stats
      await quickStats();
    }
  } catch (error) {
    output({ error: "Network error. Please try again." });
  }
}

// ADD EXPENSE
async function addExpense() {
  if (!USER_ID) return alert("Please login first");

  const amount = document.getElementById("expense-amount").value;
  const category = document.getElementById("category").value;
  const description = document.getElementById("expense-desc").value;
  
  if (!amount || amount <= 0) {
    alert("Please enter a valid amount");
    return;
  }

  const payload = {
    amount: Number(amount),
    category: category,
    description: description || "Expense"
  };

  try {
    const res = await fetch(`${API_BASE}/add-expense/${USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    output(data);
    
    if (data.success) {
      // Update balance
      USER_BALANCE -= Number(amount);
      document.getElementById('current-balance').textContent = USER_BALANCE;
      
      // Clear form
      document.getElementById("expense-amount").value = '';
      document.getElementById("expense-desc").value = '';
      
      // Refresh stats
      await quickStats();
    }
  } catch (error) {
    output({ error: "Network error. Please try again." });
  }
}

// QUICK STATS
async function quickStats() {
  if (!USER_ID) return alert("Please login first");

  try {
    const res = await fetch(`${API_BASE}/quick-stats/${USER_ID}`);
    const data = await res.json();
    output(data);
    updateStats(data);
  } catch (error) {
    output({ error: "Network error. Please try again." });
  }
}

// REPORT
async function getReport() {
  if (!USER_ID) return alert("Please login first");

  try {
    const res = await fetch(`${API_BASE}/report/${USER_ID}`);
    const data = await res.json();
    output(data);
    showReport(data);
  } catch (error) {
    output({ error: "Network error. Please try again." });
  }
}

// DOWNLOAD REPORT
function downloadReport() {
  if (!USER_ID) {
    alert("Please login first");
    return;
  }

  const url = `${API_BASE}/report/download/${USER_ID}`;
  window.open(url, "_blank");
}

// LOGOUT
function logout() {
  USER_ID = null;
  USER_NAME = "";
  USER_BALANCE = 0;
  showAuthSection();
  clearOutput();
  reportSection.classList.add('hidden');
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
});