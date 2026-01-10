const API = "https://expense-backend-5-u5kf.onrender.com";
// const API = "http://localhost:3000";

// ===============================
// DOM CONTENT LOADED
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  // Initialize date picker
  flatpickr("#datePicker", {
    dateFormat: "d-m-Y",
    altInput: true,
    altFormat: "F j, Y",
    defaultDate: "today",
    maxDate: "today"
  });
  
  // Set current date in header
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("currentDate").textContent = now.toLocaleDateString('en-US', options);
  
  // Set current year in footer
  document.getElementById("currentYear").textContent = now.getFullYear();
  
  // Load initial data
  loadUsers();
  loadQuickStats();
});

// ===============================
// LOAD USERS
// ===============================
async function loadUsers() {
  try {
    const res = await fetch(`${API}/users`);
    const result = await res.json();

    const selects = [
      document.getElementById("userName"),
      document.getElementById("expenseUser"),
      document.getElementById("deleteUser")
    ];

    selects.forEach(select => {
      if (!select) return;
      select.innerHTML = `<option value="">Select User</option>`;

      if (result.data && result.data.length > 0) {
        result.data.forEach(u => {
          const name = `${u.First_Name} ${u.Last_Name}`;
          const opt = document.createElement("option");
          opt.value = name;
          opt.textContent = name;
          select.appendChild(opt);
        });
      } else {
        const opt = document.createElement("option");
        opt.textContent = "No users found";
        opt.disabled = true;
        select.appendChild(opt);
      }
    });
    
    updateActivityFeed("Users loaded successfully", "fas fa-check-circle", "success");
  } catch (err) {
    console.error("Error loading users:", err);
    updateActivityFeed("Failed to load users", "fas fa-exclamation-circle", "error");
  }
}

// ===============================
// CREATE USER
// ===============================
async function createUser() {
  try {
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const totalAmount = document.getElementById("totalAmount").value;
    const dateValue = document.getElementById("datePicker").value;
    
    // Validate inputs
    if (!firstName || !lastName || !totalAmount || !dateValue) {
      showNotification("Please fill in all fields", "warning");
      return;
    }
    
    // Parse the selected date
    const dateParts = dateValue.split("-");
    if (dateParts.length !== 3) {
      showNotification("Invalid date format. Please use DD-MM-YYYY", "error");
      return;
    }
    
    const [day, month, year] = dateParts;
    
    const body = {
      First_Name: firstName,
      Last_Name: lastName,
      Total_Amount: Number(totalAmount),
      Date: `${day}-${month}-${year}`,
      Month: month,
      Year: year
    };

    const res = await fetch(`${API}/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("HTML response detected");
    }

    const result = await res.json();

    if (result.success) {
      showNotification("User created successfully", "success");
      updateActivityFeed(`Created user: ${firstName} ${lastName}`, "fas fa-user-plus", "info");
      
      // Clear form
      document.getElementById("firstName").value = "";
      document.getElementById("lastName").value = "";
      document.getElementById("totalAmount").value = "";
      document.getElementById("datePicker").value = "";
      
      // Refresh data
      loadUsers();
      loadQuickStats();
    } else {
      showNotification(result.error || "Create user failed", "error");
    }

  } catch (err) {
    console.error(err);
    showNotification("Error creating user. Check console for details.", "error");
  }
}

// ===============================
// ADD MONEY
// ===============================
async function addMoney() {
  const fullName = document.getElementById("userName").value;
  const addAmount = document.getElementById("addAmount").value;
  
  if (!fullName || !addAmount || addAmount <= 0) {
    showNotification("Please select a user and enter a valid amount", "warning");
    return;
  }

  const parts = fullName.split(" ");
  const first_name = parts[0];
  const last_name = parts.slice(1).join(" ");

  try {
    const res = await fetch(`${API}/add-money-by-name`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name,
        last_name,
        add_amount: Number(addAmount)
      })
    });

    const result = await res.json();
    
    if (result.success) {
      showNotification(`Successfully added $${addAmount} to ${fullName}`, "success");
      updateActivityFeed(`Added $${addAmount} to ${fullName}`, "fas fa-money-bill-wave", "info");
      
      document.getElementById("addAmount").value = "";
      loadQuickStats();
    } else {
      showNotification(result.error || "Failed to add money", "error");
    }
  } catch (err) {
    console.error(err);
    showNotification("Error adding money", "error");
  }
}

// ===============================
// ADD EXPENSE
// ===============================
async function addExpense() {
  const fullName = document.getElementById("expenseUser").value;
  const expenseAmount = document.getElementById("expenseAmount").value;
  const category = document.getElementById("expenseCategory").value;
  const description = document.getElementById("expenseDescription").value;
  
  if (!fullName || !expenseAmount || expenseAmount <= 0 || !category) {
    showNotification("Please fill in all required fields", "warning");
    return;
  }

  try {
    const users = await fetch(`${API}/users`).then(r => r.json());
    const user = users.data.find(
      u => `${u.First_Name} ${u.Last_Name}` === fullName
    );

    if (!user) {
      showNotification("User not found", "error");
      return;
    }

    const res = await fetch(`${API}/user/${user.id}/expense`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expense: Number(expenseAmount),
        category: category,
        description: description
      })
    });

    const result = await res.json();
    
    if (result.success) {
      showNotification(`Expense of $${expenseAmount} added for ${fullName}`, "success");
      updateActivityFeed(`Added $${expenseAmount} expense for ${fullName} (${category})`, "fas fa-shopping-cart", "info");
      
      document.getElementById("expenseAmount").value = "";
      document.getElementById("expenseDescription").value = "";
      loadQuickStats();
    } else {
      showNotification(result.error || "Failed to add expense", "error");
    }
  } catch (err) {
    console.error(err);
    showNotification("Error adding expense", "error");
  }
}

// ===============================
// DELETE USER
// ===============================
async function deleteUserFn() {
  const fullName = document.getElementById("deleteUser").value;
  if (!fullName) {
    showNotification("Please select a user to delete", "warning");
    return;
  }

  if (!confirm(`Are you sure you want to delete ${fullName}? This action cannot be undone.`)) {
    return;
  }

  try {
    const users = await fetch(`${API}/users`).then(r => r.json());
    const user = users.data.find(
      u => `${u.First_Name} ${u.Last_Name}` === fullName
    );

    if (!user) {
      showNotification("User not found", "error");
      return;
    }

    const res = await fetch(`${API}/user/${user.id}`, { method: "DELETE" });
    const result = await res.json();

    if (result.success) {
      showNotification(`User ${fullName} deleted successfully`, "success");
      updateActivityFeed(`Deleted user: ${fullName}`, "fas fa-user-times", "warning");
      loadUsers();
      loadQuickStats();
    } else {
      showNotification(result.error || "Failed to delete user", "error");
    }
  } catch (err) {
    console.error(err);
    showNotification("Error deleting user", "error");
  }
}

// ===============================
// QUICK STATS
// ===============================
async function loadQuickStats() {
  try {
    const res = await fetch(`${API}/quick-stats`);
    const result = await res.json();

    if (result.success) {
      const data = result.data;
      
      // Format the numbers
      document.getElementById("totalUsers").innerText = data.total_users || 0;
      document.getElementById("totalBalance").innerText = `$${formatNumber(data.total_balance || 0)}`;
      document.getElementById("todayTxn").innerText = data.todays_transactions || 0;
      document.getElementById("avgExpense").innerText = `$${formatNumber(data.avg_expense || 0)}`;
    }
    
    // Update activity feed
    updateActivityFeed("Dashboard stats updated", "fas fa-sync-alt", "info");
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

// ===============================
// HELPER FUNCTIONS
// ===============================
function formatNumber(num) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function showNotification(message, type = "info") {
  // Remove existing notification
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();
  
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  
  // Set icon based on type
  let icon = "info-circle";
  if (type === "success") icon = "check-circle";
  if (type === "error") icon = "exclamation-circle";
  if (type === "warning") icon = "exclamation-triangle";
  
  notification.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${message}</span>
    <button class="notification-close"><i class="fas fa-times"></i></button>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Add styles if not already added
  if (!document.querySelector("#notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 400px;
      }
      .notification-success {
        background: #d4edda;
        color: #155724;
        border-left: 4px solid #28a745;
      }
      .notification-error {
        background: #f8d7da;
        color: #721c24;
        border-left: 4px solid #dc3545;
      }
      .notification-warning {
        background: #fff3cd;
        color: #856404;
        border-left: 4px solid #ffc107;
      }
      .notification-info {
        background: #d1ecf1;
        color: #0c5460;
        border-left: 4px solid #17a2b8;
      }
      .notification i {
        margin-right: 10px;
        font-size: 18px;
      }
      .notification-close {
        background: none;
        border: none;
        margin-left: 15px;
        cursor: pointer;
        color: inherit;
      }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add close functionality
  notification.querySelector(".notification-close").addEventListener("click", () => {
    notification.style.animation = "slideOut 0.3s ease forwards";
    setTimeout(() => notification.remove(), 300);
  });
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOut 0.3s ease forwards";
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
  
  // Add slideOut animation
  if (!document.querySelector("#slideOut-animation")) {
    const animationStyle = document.createElement("style");
    animationStyle.id = "slideOut-animation";
    animationStyle.textContent = `
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(animationStyle);
  }
}

function updateActivityFeed(message, icon = "fas fa-info-circle", type = "info") {
  const activityFeed = document.querySelector(".activity-feed");
  if (!activityFeed) return;
  
  // Create activity item
  const activityItem = document.createElement("div");
  activityItem.className = "activity-item";
  
  // Set icon color based on type
  let iconColor = "var(--primary)";
  if (type === "success") iconColor = "#28a745";
  if (type === "error") iconColor = "#dc3545";
  if (type === "warning") iconColor = "#ffc107";
  if (type === "info") iconColor = "#17a2b8";
  
  const now = new Date();
  const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  
  activityItem.innerHTML = `
    <div class="activity-icon" style="color: ${iconColor}">
      <i class="${icon}"></i>
    </div>
    <div class="activity-content">
      <p>${message}</p>
      <span class="activity-time">${timeString}</span>
    </div>
  `;
  
  // Add to top of feed
  activityFeed.insertBefore(activityItem, activityFeed.firstChild);
  
  // Limit to 5 items
  const items = activityFeed.querySelectorAll(".activity-item");
  if (items.length > 5) {
    items[items.length - 1].remove();
  }
}