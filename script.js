const API = "http://localhost:5000";

let token = "";
let tasks = [];

// Show Register
function showRegister() {
    loginPage.style.display = "none";
    registerPage.style.display = "block";
}

// Show Login
function showLogin() {
    registerPage.style.display = "none";
    loginPage.style.display = "block";
}

// Register
async function register() {

    const userId = registerId.value.trim();
    const password = registerPassword.value;

    if (!userId || !password) {
        alert("Enter all details");
        return;
    }

    try {

        const res = await fetch(API + "/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId, password })
        });

        const data = await res.json();

        alert(data.message);

        if (res.ok) {
            registerId.value = "";
            registerPassword.value = "";
            showLogin();
        }

    } catch {
        alert("Server connection failed");
    }
}

// Login
async function login() {

    const userId = loginId.value.trim();
    const password = loginPassword.value;

    if (!userId || !password) {
        alert("Enter User ID and Password");
        return;
    }

    try {

        const res = await fetch(API + "/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId, password })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message);
            return;
        }

        token = data.token;

        loginPage.style.display = "none";
        registerPage.style.display = "none";
        dashboardPage.style.display = "block";

        welcome.innerText = "Welcome " + data.userId;

        await loadTasks();

    } catch {
        alert("Server connection failed");
    }
}

// Request Headers
function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
    };
}

// Load Tasks
async function loadTasks() {

    try {

        const res = await fetch(API + "/tasks", {
            headers: getHeaders()
        });

        if (!res.ok) {
            throw new Error("Unable to load tasks");
        }

        tasks = await res.json();

        displayTasks();

    } catch (error) {
        alert(error.message);
    }
}

// Add Task
async function addTask() {

    const name = taskName.value.trim();

    if (!name) {
        alert("Enter task name");
        return;
    }

    try {

        const res = await fetch(API + "/tasks", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({ name })
        });

        if (!res.ok) {
            throw new Error("Unable to add task");
        }

        taskName.value = "";

        await loadTasks();

    } catch (error) {
        alert(error.message);
    }
}

// Display Tasks
function displayTasks() {

    taskList.innerHTML = "";

    tasks.forEach(task => {

        const row = document.createElement("tr");

        const name = document.createElement("td");
        name.textContent = task.name;

        const status = document.createElement("td");
        status.textContent = task.status;

        const update = document.createElement("td");
        const select = document.createElement("select");

        ["Pending", "In Progress", "Completed"].forEach(value => {

            const option = document.createElement("option");

            option.value = value;
            option.textContent = value;
            option.selected = task.status === value;

            select.appendChild(option);
        });

        select.onchange = () => changeStatus(task._id, select.value);

        update.appendChild(select);

        const action = document.createElement("td");
        const button = document.createElement("button");

        button.textContent = "Delete";
        button.onclick = () => deleteTask(task._id);

        action.appendChild(button);

        row.append(name, status, update, action);

        taskList.appendChild(row);
    });

    updateDashboard();
}

// Change Status
async function changeStatus(id, status) {

    try {

        const res = await fetch(API + "/tasks/" + id, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify({ status })
        });

        if (!res.ok) {
            throw new Error("Unable to update status");
        }

        await loadTasks();

    } catch (error) {
        alert(error.message);
    }
}

// Delete Task
async function deleteTask(id) {

    if (!confirm("Are you sure you want to delete this task?")) {
        return;
    }

    try {

        const res = await fetch(API + "/tasks/" + id, {
            method: "DELETE",
            headers: getHeaders()
        });

        if (!res.ok) {
            throw new Error("Unable to delete task");
        }

        await loadTasks();

    } catch (error) {
        alert(error.message);
    }
}

// Dashboard Statistics
function updateDashboard() {

    total.innerText = tasks.length;

    pending.innerText =
        tasks.filter(t => t.status === "Pending").length;

    progress.innerText =
        tasks.filter(t => t.status === "In Progress").length;

    completed.innerText =
        tasks.filter(t => t.status === "Completed").length;
}

// Logout
function logout() {

    token = "";
    tasks = [];

    dashboardPage.style.display = "none";
    loginPage.style.display = "block";

    loginPassword.value = "";

    displayTasks();
}