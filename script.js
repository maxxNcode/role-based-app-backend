const API_BASE = '';

function getAuthHeader() {
  const token = sessionStorage.getItem('authToken');
  return token ? { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}


let currentUser = null;
let justVerified = false;
const STORAGE_KEY = "ipt_demo_v4";
window.db = {};

function loadFromStorage() {
  const rawData = localStorage.getItem(STORAGE_KEY);
  if (rawData) {
    try {
      window.db = JSON.parse(rawData);
    } catch (e) {
      seedDefaultData();
    }
  } else {
    seedDefaultData();
  }
}

function seedDefaultData() {
  window.db = {
    accounts: [],
    departments: [
      { id: 1, name: "Engineering", description: "Software development team" },
      { id: 2, name: "HR", description: "Human resources team" }
    ],
    employees: [],
    requests: []
  };
  saveToStorage();
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRouting() {
  let hash = window.location.hash || "#/";
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });
  const pageName = hash.replace("#/", "").replace("#", "");
  const pageId = pageName + "-page";
  let page = document.getElementById(pageId);
  if (!page) {
    page = document.getElementById("home-page");
  }
  const verifiedMessage = document.getElementById("verified-message");
  if (verifiedMessage) {
    if (pageName === "login" && justVerified) {
      verifiedMessage.style.display = "block";
      justVerified = false; // Reset flag
    } else {
      verifiedMessage.style.display = "none";
    }
  }

  const protectedPages = ["profile", "accounts", "employees", "department", "requests"];
  
  if (!currentUser && protectedPages.includes(pageName)) {
    navigateTo("#/login");
    return;
  }
  const adminOnlyPages = ["accounts", "employees", "department"];
  
  if (currentUser && currentUser.role !== "admin" && adminOnlyPages.includes(pageName)) {
    navigateTo("#/");
    return;
  }
  page.classList.add("active");
  
  if (pageName === "profile") {
    renderProfile();
  }
  if (pageName === "accounts") {
    renderAccountsList();
  }
  if (pageName === "department") {
    renderDepartmentsList();
  }
  if (pageName === "employees") {
    renderEmployeesTable();
  }
  if (pageName === "requests") {
    renderRequestsList();
  }
  if (pageName === "verify-email") {
    const verifyEmailDisplay = document.getElementById("verify-email-display");
    const unverifiedEmail = sessionStorage.getItem('unverified_email');
    if (verifyEmailDisplay && unverifiedEmail) {
      verifyEmailDisplay.innerText = unverifiedEmail;
    }
  }
}

window.addEventListener("hashchange", handleRouting);

function setAuthState(isLoggedIn, user = null) {
  currentUser = user;
  document.body.classList.toggle("authenticated", isLoggedIn);
  document.body.classList.toggle("not-authenticated", !isLoggedIn);

  if (user && user.role === "admin") {
    document.body.classList.add("is-admin");
  } else {
    document.body.classList.remove("is-admin");
  }
  const navUsername = document.getElementById("nav-username");
  if (navUsername && user) {
    navUsername.innerText = user.firstName;
  }
}

async function handleLogin() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }
  try {
    const response = await fetch(API_BASE + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password })
    });

    const data = await response.json();
    if (response.ok) {
      sessionStorage.setItem('authToken', data.token);

      const user = {
        firstName: data.user.firstName || data.user.email,
        lastName: data.user.lastName || '',
        email: email,
        role: data.user.role,
        verified: true
      };
      setAuthState(true, user);
      navigateTo("#/profile");
      alert("Login successful! Welcome, " + user.firstName);
    } else {
      alert("Login failed: " + data.error);
    }
  } catch (err) {
    console.error('Login error:', err);
    alert("Network error. Is the backend running on " + API_BASE + "?");
  }
}


async function handleRegister() {
  const firstName = document.getElementById("reg-firstname").value;
  const lastName = document.getElementById("reg-lastname").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  if (!firstName || !lastName || !email || !password) {
    alert("Please fill in all fields");
    return;
  }
  if (password.length < 6) {
    alert("Password must be at least 6 characters");
    return;
  }

  try {
    const response = await fetch(API_BASE + '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password, firstName: firstName, lastName: lastName, role: 'user' })
    });

    const data = await response.json();

    if (response.ok) {
      // Store email for the verify page to display
      sessionStorage.setItem('unverified_email', email);
      alert("Registration successful! Please verify your email.");
      navigateTo("#/verify-email");
    } else {
      alert("Registration failed: " + data.error);
    }
  } catch (err) {
    console.error('Register error:', err);
    alert("Network error. Is the backend running?");
  }
}



function handleVerify() {
  const unverifiedEmail = sessionStorage.getItem('unverified_email');

  if (!unverifiedEmail) {
    alert("No pending verification found. Please register first.");
    navigateTo("#/register");
    return;
  }

  // Simulate verification (server already registered the user)
  sessionStorage.removeItem('unverified_email');
  justVerified = true;
  alert("Email verified! You can now login with email: " + unverifiedEmail);
  navigateTo("#/login");
}



function handleLogout() {
  sessionStorage.removeItem('authToken');
  setAuthState(false, null);
  navigateTo("#/");
  alert("You have been logged out");
}

document.addEventListener("DOMContentLoaded", async function() {
  // Load CRUD data (requests, employees, departments) from localStorage
  loadFromStorage();

  const savedToken = sessionStorage.getItem('authToken');
  if (savedToken) {
    try {
      const response = await fetch(API_BASE + '/api/profile', {
        headers: getAuthHeader()
      });

      if (response.ok) {
        const data = await response.json();
        const user = {
          firstName: data.user.firstName || data.user.email,
          lastName: data.user.lastName || '',
          email: data.user.email,
          role: data.user.role,
          verified: true
        };
        setAuthState(true, user);
      } else {
        // Token expired or invalid — clear it
        sessionStorage.removeItem('authToken');
      }
    } catch (err) {
      console.error('Session restore failed:', err);
      sessionStorage.removeItem('authToken');
    }
  }

  handleRouting();
  setupButtonHandlers();
});

async function loadAdminDashboard() {
  try {
    const response = await fetch(API_BASE + '/api/admin/dashboard', {
      headers: getAuthHeader()
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Admin dashboard data:', data);
      // You could display data.message in the UI
    } else {
      const errorData = await response.json();
      console.log('Access denied:', errorData.error);
    }
  } catch (err) {
    console.error('Network error:', err);
  }
}


async function loadGuestContent() {
  try {
    const response = await fetch(API_BASE + '/api/content/guest');

    if (response.ok) {
      const data = await response.json();
      console.log('Guest content:', data.message);
    }
  } catch (err) {
    console.error('Network error:', err);
  }
}


function setupButtonHandlers() {
  const getStartedBtn = document.querySelector(".getstarted-btn");
  if (getStartedBtn) {
    getStartedBtn.onclick = function() {
      navigateTo("#/register");
    };
  }
  const loginBtn = document.querySelector("#login-page .btn-primary");
  if (loginBtn) {
    loginBtn.onclick = handleLogin;
  }
  const registerBtn = document.querySelector("#register-page .btn-success");
  if (registerBtn) {
    registerBtn.onclick = handleRegister;
  }
  const verifyBtn = document.querySelector("#verify-email-page .btn-success");
  if (verifyBtn) {
    verifyBtn.onclick = handleVerify;
  }
  setupNavigationLinks();
}

function setupNavigationLinks() {
  const loginLink = document.querySelector('.links a[href="#login"]');
  if (loginLink) {
    loginLink.onclick = function(e) {
      e.preventDefault();
      navigateTo("#/login");
    };
  }
  const registerLink = document.querySelector('.links a[href="#register"]');
  if (registerLink) {
    registerLink.onclick = function(e) {
      e.preventDefault();
      navigateTo("#/register");
    };
  }
  const logoutLink = document.querySelector(".dropdown-item[href='#logout']");
  if (logoutLink) {
    logoutLink.onclick = function(e) {
      e.preventDefault();
      handleLogout();
    };
  }
  const dropdownMenu = document.querySelector('.nav-admin .dropdown-menu');
  if (dropdownMenu) {
    dropdownMenu.addEventListener('click', function(e) {
      const link = e.target.closest('.dropdown-item');
      if (link) {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#') && href !== '#logout') {
          e.preventDefault();
          e.stopPropagation();
          const page = href.replace('#', '');
          navigateTo('#/' + page);
        }
      }
    });
  }
}

function goToRegister() {
  navigateTo("#/register");
}

function goToLogin() {
  navigateTo("#/login");
}

function renderProfile() {
    if (!currentUser) return;
    const profileContent = document.getElementById("profile-content");
    if (profileContent) {
        profileContent.innerHTML = `
            <h3>${currentUser.firstName} ${currentUser.lastName}</h3>
            <p><strong>Email: </strong><span>${currentUser.email}</span></p>
            <p><strong>Role: </strong><span>${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</span></p>
            <button class="btn btn-primary" onclick="showEditProfile()">Edit Profile</button>
        `;
    }
    const editForm = document.getElementById("profile-edit");
    if (editForm) {
        editForm.style.display = "none";
    }
}

function showEditProfile() {
    if (!currentUser) return;
    document.getElementById("edit-firstname").value = currentUser.firstName;
    document.getElementById("edit-lastname").value = currentUser.lastName;
    document.getElementById("edit-email").value = currentUser.email;
    document.getElementById("edit-password").value = "";
    document.getElementById("profile-content").style.display = "none";
    document.getElementById("profile-edit").style.display = "block";
}

function handleSaveProfile() {
    if (!currentUser) return;
    const firstName = document.getElementById("edit-firstname").value;
    const lastName = document.getElementById("edit-lastname").value;
    const newPassword = document.getElementById("edit-password").value;
    if (!firstName || !lastName) {
        alert("First name and last name are required");
        return;
    }
    
    const userIndex = window.db.accounts.findIndex(account => 
        account.email === currentUser.email
    );
    
    if (userIndex !== -1) {
        window.db.accounts[userIndex].firstName = firstName;
        window.db.accounts[userIndex].lastName = lastName;
        
        if (newPassword) {
            window.db.accounts[userIndex].password = newPassword;
        }
        
        saveToStorage();
        
        currentUser.firstName = firstName;
        currentUser.lastName = lastName;
        if (newPassword) {
            currentUser.password = newPassword;
        }
        
        const navUsername = document.getElementById("nav-username");
        if (navUsername) {
            navUsername.innerText = firstName;
        }
        
        document.getElementById("profile-content").style.display = "block";
        document.getElementById("profile-edit").style.display = "none";
        
        renderProfile();
        
        alert("Profile updated successfully!");
    }
}

function cancelEditProfile() {
    document.getElementById("profile-content").style.display = "block";
    document.getElementById("profile-edit").style.display = "none";
}

function renderAccountsList() {
    const tableBody = document.getElementById("accounts-table-body");
    if (!tableBody) return;
    
    let html = "";
    
    for (let i = 0; i < window.db.accounts.length; i++) {
        const account = window.db.accounts[i];
        const fullName = account.firstName + " " + account.lastName;
        const verifiedText = account.verified ? "✓" : "—";
        const roleDisplay = account.role.charAt(0).toUpperCase() + account.role.slice(1);
        
        html += `
            <tr>
                <td>${fullName}</td>
                <td>${account.email}</td>
                <td>${roleDisplay}</td>
                <td>${verifiedText}</td>
                <td class="tb-btn-holder">
                    <button type="button" class="btn btn-outline-primary" onclick="editAccount('${account.email}')">Edit</button>
                    <button type="button" class="btn btn-outline-warning" onclick="resetAccountPassword('${account.email}')">Reset PW</button>
                    <button type="button" class="btn btn-outline-danger" onclick="deleteAccount('${account.email}')">Delete</button>
                </td>
            </tr>
        `;
    }
    
    tableBody.innerHTML = html;
}

function showAddAccountForm() {
    document.getElementById("account-form-title").innerText = "Add Account";
    document.getElementById("account-edit-email").value = "";
    document.getElementById("account-firstname").value = "";
    document.getElementById("account-lastname").value = "";
    document.getElementById("account-email").value = "";
    document.getElementById("account-email").readOnly = false;
    document.getElementById("account-password").value = "";
    document.getElementById("account-role").value = "user";
    document.getElementById("account-verified").checked = false;
    document.getElementById("account-form-container").style.display = "block";
}

function editAccount(email) {
    const account = window.db.accounts.find(acc => acc.email === email);
    if (!account) return;
    
    document.getElementById("account-form-title").innerText = "Edit Account";
    document.getElementById("account-edit-email").value = email;
    document.getElementById("account-firstname").value = account.firstName;
    document.getElementById("account-lastname").value = account.lastName;
    document.getElementById("account-email").value = account.email;
    document.getElementById("account-email").readOnly = true;
    document.getElementById("account-password").value = "";
    document.getElementById("account-password").placeholder = "Leave blank to keep current";
    document.getElementById("account-role").value = account.role;
    document.getElementById("account-verified").checked = account.verified;
    document.getElementById("account-form-container").style.display = "block";
}

function resetAccountPassword(email) {
    const newPassword = prompt("Enter new password (min 6 characters):");
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
        alert("Password must be at least 6 characters");
        return;
    }
    
    const account = window.db.accounts.find(acc => acc.email === email);
    if (account) {
        account.password = newPassword;
        saveToStorage();
        alert("Password reset successfully for " + email);
    }
}

function deleteAccount(email) {
    if (currentUser && currentUser.email === email) {
        alert("You cannot delete your own account!");
        return;
    }
    
    if (!confirm("Are you sure you want to delete this account?")) return;
    
    const index = window.db.accounts.findIndex(acc => acc.email === email);
    if (index !== -1) {
        window.db.accounts.splice(index, 1);
        saveToStorage();
        renderAccountsList();
        alert("Account deleted successfully");
    }
}

function handleSaveAccount() {
    const editEmail = document.getElementById("account-edit-email").value;
    const firstName = document.getElementById("account-firstname").value;
    const lastName = document.getElementById("account-lastname").value;
    const email = document.getElementById("account-email").value;
    const password = document.getElementById("account-password").value;
    const role = document.getElementById("account-role").value;
    const verified = document.getElementById("account-verified").checked;
    
    if (!firstName || !lastName || !email) {
        alert("First name, last name, and email are required");
        return;
    }
    
    if (editEmail === "") {
        if (!password || password.length < 6) {
            alert("Password is required and must be at least 6 characters");
            return;
        }
        
        const exists = window.db.accounts.find(acc => acc.email === email);
        if (exists) {
            alert("Email already exists");
            return;
        }
        
        window.db.accounts.push({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            role: role,
            verified: verified
        });
    } else {
        const account = window.db.accounts.find(acc => acc.email === editEmail);
        if (account) {
            account.firstName = firstName;
            account.lastName = lastName;
            account.role = role;
            account.verified = verified;
            
            if (password && password.length >= 6) {
                account.password = password;
            }
        }
    }
    
    saveToStorage();
    hideAccountForm();
    renderAccountsList();
    alert("Account saved successfully");
}

function hideAccountForm() {
    document.getElementById("account-form-container").style.display = "none";
}

function renderDepartmentsList() {
    const tableBody = document.getElementById("departments-table-body");
    if (!tableBody) return;
    
    let html = "";
    
    for (let i = 0; i < window.db.departments.length; i++) {
        const dept = window.db.departments[i];
        
        html += `
            <tr>
                <td>${dept.name}</td>
                <td>${dept.description}</td>
                <td class="tb-btn-holder">
                    <button type="button" class="btn btn-outline-primary" onclick="editDepartment(${dept.id})">Edit</button>
                    <button type="button" class="btn btn-outline-danger" onclick="deleteDepartment(${dept.id})">Delete</button>
                </td>
            </tr>
        `;
    }
    
    tableBody.innerHTML = html;
}

function showAddDepartmentForm() {
    alert("Not implemented");
}

function editDepartment(id) {
    alert("Not implemented");
}

function deleteDepartment(id) {
    if (!confirm("Are you sure you want to delete this department?")) return;
    
    const index = window.db.departments.findIndex(dept => dept.id === id);
    if (index !== -1) {
        window.db.departments.splice(index, 1);
        saveToStorage();
        renderDepartmentsList();
        alert("Department deleted successfully");
    }
}

function renderEmployeesTable() {
    const tableBody = document.getElementById("employees-table-body");
    if (!tableBody) return;
    
    let html = "";
    
    for (let i = 0; i < window.db.employees.length; i++) {
        const emp = window.db.employees[i];
        
        const account = window.db.accounts.find(acc => acc.email === emp.userEmail);
        const displayName = account ? (account.firstName + " " + account.lastName) : emp.userEmail;
        
        const dept = window.db.departments.find(d => String(d.id) === String(emp.departmentId));
        const deptName = dept ? dept.name : "—";
        
        html += `
            <tr>
                <th scope="row">${emp.id}</th>
                <td>${emp.userEmail}</td>
                <td>${emp.position}</td>
                <td>${deptName}</td>
                <td class="tb-btn-holder">
                    <button type="button" class="btn btn-outline-primary" onclick="editEmployee('${emp.id}')">Edit</button>
                    <button type="button" class="btn btn-outline-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
                </td>
            </tr>
        `;
    }
    
    tableBody.innerHTML = html;
}

function populateDepartmentDropdown() {
    const select = document.getElementById("emp-department");
    if (!select) return;
    
    let html = '<option value="">Select Department</option>';
    
    for (let i = 0; i < window.db.departments.length; i++) {
        const dept = window.db.departments[i];
        html += `<option value="${dept.id}">${dept.name}</option>`;
    }
    
    select.innerHTML = html;
}

function showAddEmployeeForm() {
    document.getElementById("employee-form-title").innerText = "Add Employee";
    document.getElementById("employee-edit-id").value = "";
    document.getElementById("emp-id").value = "";
    document.getElementById("emp-id").readOnly = false;
    document.getElementById("emp-email").value = "";
    document.getElementById("emp-position").value = "";
    document.getElementById("emp-date").value = "";
    populateDepartmentDropdown();
    document.getElementById("employee-form-container").style.display = "block";
}

function editEmployee(id) {
    const emp = window.db.employees.find(e => e.id === id);
    if (!emp) return;
    
    document.getElementById("employee-form-title").innerText = "Edit Employee";
    document.getElementById("employee-edit-id").value = id;
    document.getElementById("emp-id").value = emp.id;
    document.getElementById("emp-id").readOnly = true;
    document.getElementById("emp-email").value = emp.userEmail;
    document.getElementById("emp-position").value = emp.position;
    document.getElementById("emp-date").value = emp.hireDate || "";
    populateDepartmentDropdown();
    document.getElementById("emp-department").value = emp.departmentId || "";
    document.getElementById("employee-form-container").style.display = "block";
}

function deleteEmployee(id) {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    
    const index = window.db.employees.findIndex(e => e.id === id);
    if (index !== -1) {
        window.db.employees.splice(index, 1);
        saveToStorage();
        renderEmployeesTable();
        alert("Employee deleted successfully");
    }
}

function handleSaveEmployee() {
    const editId = document.getElementById("employee-edit-id").value;
    const empId = document.getElementById("emp-id").value;
    const userEmail = document.getElementById("emp-email").value;
    const position = document.getElementById("emp-position").value;
    const departmentId = document.getElementById("emp-department").value;
    const hireDate = document.getElementById("emp-date").value;
    
    if (!empId || !userEmail || !position) {
        alert("Employee ID, User Email, and Position are required");
        return;
    }
    const account = window.db.accounts.find(acc => acc.email === userEmail);
    if (!account) {
        alert("User email must match an existing account");
        return;
    }
    if (editId === "") {
        const exists = window.db.employees.find(e => e.id === empId);
        if (exists) {
            alert("Employee ID already exists");
            return;
        }
        window.db.employees.push({
            id: empId,
            userEmail: userEmail,
            position: position,
            departmentId: departmentId,
            hireDate: hireDate
        });
    } else {
        const emp = window.db.employees.find(e => e.id === editId);
        if (emp) {
            emp.userEmail = userEmail;
            emp.position = position;
            emp.departmentId = departmentId;
            emp.hireDate = hireDate;
        }
    }
    saveToStorage();
    hideEmployeeForm();
    renderEmployeesTable();
    alert("Employee saved successfully");
}

function hideEmployeeForm() {
    document.getElementById("employee-form-container").style.display = "none";
}

function renderRequestsList() {
    const tableBody = document.getElementById("requests-table-body");
    const noRequestsMsg = document.getElementById("no-requests-msg");
    const requestsTable = document.getElementById("requests-table");
    
    if (!tableBody) return;
    
    const userRequests = window.db.requests.filter(req => req.employeeEmail === currentUser.email);
    
    if (userRequests.length === 0) {
        if (requestsTable) requestsTable.style.display = "none";
        if (noRequestsMsg) noRequestsMsg.style.display = "block";
        return;
    }
    
    if (requestsTable) requestsTable.style.display = "table";
    if (noRequestsMsg) noRequestsMsg.style.display = "none";

    let html = "";
    for (let i = 0; i < userRequests.length; i++) {
        const req = userRequests[i];
        let itemsSummary = "";
        if (req.items && req.items.length > 0) {
            itemsSummary = req.items.map(item => item.name + " (" + item.qty + ")").join(", ");
        }
        let statusBadge = "";
        if (req.status === "Pending") {
            statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
        } else if (req.status === "Approved") {
            statusBadge = '<span class="badge bg-success">Approved</span>';
        } else if (req.status === "Rejected") {
            statusBadge = '<span class="badge bg-danger">Rejected</span>';
        }
        html += `
            <tr>
                <td>${req.type}</td>
                <td>${itemsSummary}</td>
                <td>${req.date}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }
    tableBody.innerHTML = html;
}

function addRequestItem() {
    const container = document.getElementById("request-items-container");
    if (!container) return;
    
    const itemDiv = document.createElement("div");
    itemDiv.className = "input-group mb-2";
    itemDiv.innerHTML = `
        <input type="text" class="form-control request-item-name" placeholder="Item name">
        <input type="number" class="form-control request-item-qty" value="1" style="max-width: 60px;" min="1">
        <button class="btn btn-outline-danger" type="button" onclick="removeRequestItem(this)">×</button>
    `;
    
    container.appendChild(itemDiv);
}

function removeRequestItem(button) {
    const itemDiv = button.parentElement;
    if (itemDiv) {
        itemDiv.remove();
    }
}

function handleSubmitRequest() {
    if (!currentUser) return;
    
    const type = document.getElementById("request-type").value;
    const itemNames = document.querySelectorAll(".request-item-name");
    const itemQtys = document.querySelectorAll(".request-item-qty");
    
    const items = [];
    for (let i = 0; i < itemNames.length; i++) {
        const name = itemNames[i].value.trim();
        const qty = parseInt(itemQtys[i].value) || 1;
        
        if (name) {
            items.push({ name: name, qty: qty });
        }
    }
    
    if (items.length === 0) {
        alert("Please add at least one item");
        return;
    }
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    const newRequest = {
        type: type,
        items: items,
        status: "Pending",
        date: dateStr,
        employeeEmail: currentUser.email
    };
    
    window.db.requests.push(newRequest);
    saveToStorage();
    
    const modal = bootstrap.Modal.getInstance(document.getElementById("newRequestModal"));
    if (modal) {
        modal.hide();
    }
    
    clearRequestForm();
    
    renderRequestsList();
    
    alert("Request submitted successfully!");
}

function clearRequestForm() {
    document.getElementById("request-type").value = "Equipment";
    const container = document.getElementById("request-items-container");
    if (container) {
        container.innerHTML = "";
    }
    addRequestItem();
}

document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("newRequestModal");
    if (modal) {
        modal.addEventListener("show.bs.modal", function() {
            clearRequestForm();
        });
    }
});