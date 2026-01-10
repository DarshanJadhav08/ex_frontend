const BASE_URL = "https://expense-backend-3-badu.onrender.com";

// DOM Elements
const fname = document.getElementById("fname");
const lname = document.getElementById("lname");
const total = document.getElementById("total");
const date = document.getElementById("date");
const month = document.getElementById("month");
const userId = document.getElementById("userId");
const addMoneyAmount = document.getElementById("addMoneyAmount");
const expAmount = document.getElementById("expAmount");
const category = document.getElementById("category");
const desc = document.getElementById("desc");
const deleteUserId = document.getElementById("deleteUserId");
const loadingScreen = document.getElementById("loadingScreen");
const mainContainer = document.getElementById("mainContainer");
const notificationsContainer = document.querySelector(".notifications-container");

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  // Hide loading screen after 1.5 seconds
  setTimeout(() => {
    loadingScreen.style.display = "none";
    mainContainer.classList.remove("d-none");
  }, 1500);
  
  // Set default dates
  const today = new Date();
  date.value = today.toISOString().split('T')[0];
  month.value = today.toISOString().substring(0, 7);
});

// Notification function
function notify(type, msg) {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="d-flex align-items-center">
      <i class="bi ${type === 'success' ? 'bi-check-circle-fill text-success' : 'bi-x-circle-fill text-danger'} me-2 fs-5"></i>
      <span>${msg}</span>
    </div>
  `;
  notificationsContainer.appendChild(notification);
  
  // Remove notification after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 5000);
}

// CREATE USER
async function createUser() {
  if (!fname.value || !lname.value || !total.value || !date.value || !month.value) {
    notify("error", "Please fill all required fields");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        First_Name: fname.value.trim(),
        Last_Name: lname.value.trim(),
        Total_Amount: Number(total.value),
        Date: date.value,
        Month: month.value,
        Year: new Date().getFullYear(),
        Category: "Initial",
        Description: "Account created"
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create user");

    notify("success", `User created successfully with ID: ${data.user_id || data.id}`);
    
    // Clear form
    fname.value = "";
    lname.value = "";
    total.value = "";
    
  } catch (e) {
    notify("error", e.message || "Network error. Please try again.");
  }
}

// ADD MONEY
async function addMoney() {
  const uid = userId.value.trim();
  const amount = addMoneyAmount.value;

  if (!uid || !amount) {
    notify("error", "Please enter User UUID and Amount");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/add-money/${uid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add_amount: Number(amount) })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add money");

    notify("success", `₹${amount} added to user ${uid}`);
    addMoneyAmount.value = "";
    
  } catch (e) {
    notify("error", e.message || "Invalid User UUID or network error");
  }
}

// ADD EXPENSE
async function addExpense() {
  const uid = userId.value.trim();

  if (!uid || !expAmount.value || !category.value || !desc.value) {
    notify("error", "Please fill all required fields");
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/add-expense/${uid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expense: Number(expAmount.value),
        category: category.value.trim(),
        description: desc.value.trim()
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add expense");

    notify("success", `Expense of ₹${expAmount.value} added successfully`);
    
    // Clear form
    expAmount.value = "";
    category.value = "";
    desc.value = "";
    
  } catch (e) {
    notify("error", e.message || "Invalid User UUID or network error");
  }
}

// DELETE USER
async function deleteUser() {
  const uid = deleteUserId.value.trim();
  if (!uid) {
    notify("error", "Please enter User UUID");
    return;
  }

  // Confirmation dialog
  if (!confirm(`Are you sure you want to delete user ${uid}? This action cannot be undone!`)) {
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/delete/${uid}`, {
      method: "DELETE"
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete user");

    notify("success", `User ${uid} deleted successfully`);
    deleteUserId.value = "";
    
  } catch (e) {
    notify("error", e.message || "User not found or network error");
  }
}

// Add input validation styling
document.querySelectorAll('.form-control').forEach(input => {
  input.addEventListener('blur', function() {
    if (!this.value.trim()) {
      this.style.borderColor = '#dc3545';
    } else {
      this.style.borderColor = '#28a745';
      setTimeout(() => {
        this.style.borderColor = '#e0e0e0';
      }, 1000);
    }
  });
  
  input.addEventListener('focus', function() {
    this.style.borderColor = '#667eea';
  });
});