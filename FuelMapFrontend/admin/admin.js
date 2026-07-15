console.log("admin.js загружен");

// =====================================
// ELEMENTS
// =====================================

const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

const loginScreen = document.getElementById("loginScreen");
const adminPanel = document.getElementById("adminPanel");

const adminPassword = document.getElementById("adminPassword");
const adminLoginError = document.getElementById("adminLoginError");

const TOKEN_KEY = "admin_token";


// =====================================
// HELPERS
// =====================================

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getHeaders() {
    return {
        Authorization: `Bearer ${getToken()}`
    };
}

async function api(url, options = {}) {

    const response = await fetch(`${API}${url}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...getHeaders()
        }
    });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error("Unauthorized");
    }

    return response;
}


// =====================================
// LOGIN
// =====================================

async function login() {

    adminLoginError.textContent = "";

    const password = adminPassword.value.trim();

    if (!password) {
        adminLoginError.textContent = "Введите пароль";
        return;
    }

    try {

        const response = await fetch(`${API}/admin/login`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                password
            })

        });

        const data = await response.json();

        if (!response.ok) {

            adminLoginError.textContent =
                data.detail || "Ошибка входа";

            return;
        }

        localStorage.setItem(
            TOKEN_KEY,
            data.token
        );

        loginScreen.style.display = "none";
        adminPanel.style.display = "flex";

        await loadStats();

    } catch (err) {

        console.error(err);

        adminLoginError.textContent =
            "Сервер недоступен";

    }

}

if (adminLoginBtn) {
    adminLoginBtn.onclick = login;
}

if (adminPassword) {

    adminPassword.addEventListener("keydown", e => {

        if (e.key === "Enter") {
            login();
        }

    });

}


// =====================================
// LOGOUT
// =====================================

function logout() {

    localStorage.removeItem(TOKEN_KEY);

    location.reload();

}

if (adminLogoutBtn) {
    adminLogoutBtn.onclick = logout;
}


// =====================================
// AUTO LOGIN
// =====================================

document.addEventListener("DOMContentLoaded", async () => {

    if (!getToken())
        return;

    loginScreen.style.display = "none";
    adminPanel.style.display = "flex";

    await loadStats();

});


// =====================================
// TABS
// =====================================

const tabs = [

    "dashboard",

    "analytics",

    "visits",

    "users",

    "stations",

    "reports",

    "achievements"

];

function openTab(tab, event = null) {

    tabs.forEach(name => {

        const page = document.getElementById(
            name + "Tab"
        );

        if (page)
            page.style.display = "none";

    });

    const current = document.getElementById(
        tab + "Tab"
    );

    if (current)
        current.style.display = "block";

    document
        .querySelectorAll(".admin-menu button")
        .forEach(btn => btn.classList.remove("active"));

    if (event)
        event.target.classList.add("active");

    switch (tab) {

        case "users":
            loadUsers();
            break;

        case "stations":
            loadStations();
            break;

        case "reports":
            loadReports();
            break;

        case "visits":
            loadVisits();
            break;

    }

}


// =====================================
// STATS
// =====================================

async function loadStats() {

    try {

        const response = await api("/admin/stats");

        const data = await response.json();

        document.getElementById("statUsers").textContent =
            data.users ?? 0;

        document.getElementById("statStations").textContent =
            data.stations ?? 0;

        document.getElementById("statReports").textContent =
            data.reports ?? 0;

        document.getElementById("statOnline").textContent =
            data.online ?? 0;

    }

    catch (err) {

        console.error("Stats error", err);

    }

}

// =====================================
// USERS
// =====================================

async function loadUsers() {

    const table = document.getElementById("usersTable");

    if (!table) return;

    table.innerHTML = "Загрузка...";

    try {

        const response = await api("/admin/users");

        const users = await response.json();

        table.innerHTML = "";

        table.innerHTML += `
        <div class="admin-row">
            <b>ID</b>
            <b>Имя</b>
            <b>Email</b>
            <b>Дата регистрации</b>
            <b>Действия</b>
        </div>
        `;

        users.forEach(user => {

            table.innerHTML += `
            <div class="admin-row">

                <span>#${user.id}</span>

                <span>${user.name || "Без имени"}</span>

                <span>${user.email}</span>

                <span>${user.created_at || "-"}</span>

                <div>

                    <button
                        class="admin-btn"
                        onclick="openUserModal(${user.id})">

                        👁

                    </button>

                </div>

            </div>
            `;

        });

    }

    catch (err) {

        console.error(err);

        table.innerHTML = "Ошибка загрузки пользователей";

    }

}



// =====================================
// USER MODAL
// =====================================

async function openUserModal(id) {

    try {

        const response = await api("/admin/users");

        const users = await response.json();

        const user = users.find(u => u.id === id);

        if (!user) return;

        const modal =
            document.getElementById("userModal");

        const content =
            document.getElementById("userModalContent");

        content.innerHTML = `

            <div class="user-info">

                <div>

                    <b>ID</b><br>

                    ${user.id}

                </div>

                <div>

                    <b>Имя</b><br>

                    ${user.name || "Без имени"}

                </div>

                <div>

                    <b>Email</b><br>

                    ${user.email}

                </div>

                <div>

                    <b>Дата регистрации</b><br>

                    ${user.created_at || "-"}

                </div>

                <div>

                    <b>Google</b><br>

                    ${user.via_google ? "Да" : "Нет"}

                </div>

                <div
                    style="
                    display:flex;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-top:10px;
                    ">

                    <button
                        class="admin-btn"
                        onclick="blockUser(${user.id})">

                        🚫 Заблокировать

                    </button>

                    <button
                        class="admin-btn"
                        onclick="unblockUser(${user.id})">

                        ✅ Разблокировать

                    </button>

                    <button
                        class="admin-btn"
                        style="background:#dc2626"
                        onclick="deleteUser(${user.id})">

                        🗑 Удалить

                    </button>

                </div>

            </div>

        `;

        modal.style.display = "flex";

    }

    catch (err) {

        console.error(err);

    }

}



function closeUserModal() {

    document.getElementById(
        "userModal"
    ).style.display = "none";

}



window.onclick = function (event) {

    const modal =
        document.getElementById("userModal");

    if (event.target === modal)
        closeUserModal();

}



// =====================================
// USER ACTIONS
// =====================================

async function blockUser(id) {

    if (!confirm("Заблокировать пользователя?"))
        return;

    await api(`/admin/users/${id}/block`, {
        method: "PUT"
    });

    alert("Пользователь заблокирован");

}



async function unblockUser(id) {

    await api(`/admin/users/${id}/unblock`, {
        method: "PUT"
    });

    alert("Пользователь разблокирован");

}



async function deleteUser(id) {

    if (!confirm("Удалить пользователя?"))
        return;

    await api(`/admin/users/${id}`, {
        method: "DELETE"
    });

    closeUserModal();

    loadUsers();

}

// =====================================
// STATIONS
// =====================================

async function loadStations() {

    const table = document.getElementById("stationsTable");

    if (!table) return;

    table.innerHTML = "Загрузка...";

    try {

        const response = await api("/admin/stations");

        const stations = await response.json();

        table.innerHTML = `
            <div class="admin-row">
                <b>ID</b>
                <b>Название</b>
                <b>Статус</b>
                <b>Координаты</b>
                <b>Действия</b>
            </div>
        `;

        stations.forEach(station => {

            table.innerHTML += `
                <div class="admin-row">

                    <span>#${station.id}</span>

                    <span>${station.name}</span>

                    <span>${station.status}</span>

                    <span>
                        ${station.lat},
                        ${station.lng}
                    </span>

                    <div>

                        <button
                            class="admin-btn"
                            style="background:#dc2626"
                            onclick="deleteStation(${station.id})">

                            🗑

                        </button>

                    </div>

                </div>
            `;

        });

    }

    catch (err) {

        console.error(err);

        table.innerHTML = "Ошибка загрузки";

    }

}



async function deleteStation(id) {

    if (!confirm("Удалить заправку?"))
        return;

    try {

        await api(`/admin/stations/${id}`, {
            method: "DELETE"
        });

        loadStations();

        loadStats();

    }

    catch (err) {

        console.error(err);

        alert("Не удалось удалить");

    }

}



// =====================================
// REPORTS
// =====================================

async function loadReports() {

    const table =
        document.getElementById("reportsTable");

    if (!table) return;

    table.innerHTML = "Загрузка...";

    try {

        const response =
            await api("/admin/reports");

        const reports =
            await response.json();

        table.innerHTML = `
            <div class="admin-row">
                <b>ID</b>
                <b>АЗС</b>
                <b>Автор</b>
                <b>Комментарий</b>
                <b>Дата</b>
                <b></b>
            </div>
        `;

        reports.forEach(report => {

            table.innerHTML += `
                <div class="admin-row">

                    <span>
                        #${report.id}
                    </span>

                    <span>
                        ${report.station_name}
                    </span>

                    <span>
                        ${report.author}
                    </span>

                    <span>
                        ${report.comment}
                    </span>

                    <span>
                        ${report.created_at}
                    </span>

                    <button
                        class="admin-btn"
                        style="background:#dc2626"
                        onclick="deleteReport(${report.id})">

                        🗑

                    </button>

                </div>
            `;

        });

    }

    catch (err) {

        console.error(err);

        table.innerHTML =
            "Ошибка загрузки репортов";

    }

}



async function deleteReport(id) {

    if (!confirm("Удалить репорт?"))
        return;

    try {

        await api(`/admin/reports/${id}`, {
            method: "DELETE"
        });

        loadReports();

        loadStats();

    }

    catch (err) {

        console.error(err);

        alert("Ошибка удаления");

    }

}

// =====================================
// VISITS
// =====================================

async function loadVisits() {

    const table = document.getElementById("visitsTable");

    if (!table) return;

    table.innerHTML = "Загрузка...";

    try {

        const response =
            await api("/admin/visits");

        const data =
            await response.json();

        table.innerHTML = `

            <h3 style="margin-bottom:20px">
                🌐 Всего посещений: ${data.total}
            </h3>

            <div class="admin-row">
                <b>IP</b>
                <b>Браузер</b>
                <b>Устройство</b>
                <b>Дата</b>
            </div>

        `;

        data.visits.forEach(v => {

            table.innerHTML += `

                <div class="admin-row">

                    <span>${v.ip}</span>

                    <span>${v.browser}</span>

                    <span>${v.device}</span>

                    <span>${v.created_at}</span>

                </div>

            `;

        });

    }

    catch (err) {

        console.error(err);

        table.innerHTML =
            "Ошибка загрузки посещений";

    }

}



// =====================================
// ANALYTICS
// =====================================

async function loadAnalytics() {

    try {

        const response =
            await api("/admin/visits");

        const data =
            await response.json();

        const cards =
            document.querySelectorAll(
                "#analyticsTab .stat-number"
            );

        if (cards.length >= 3) {

            cards[0].textContent =
                data.total;

            cards[1].textContent =
                data.total;

            cards[2].textContent =
                data.total;

        }

    }

    catch (err) {

        console.error(err);

    }

}



// =====================================
// NOTIFICATIONS
// =====================================

function showMessage(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    div.style.position = "fixed";
    div.style.right = "20px";
    div.style.bottom = "20px";
    div.style.padding = "12px 18px";
    div.style.background = "#2563eb";
    div.style.color = "#fff";
    div.style.borderRadius = "12px";
    div.style.zIndex = "9999";

    document.body.appendChild(div);

    setTimeout(() => {

        div.remove();

    }, 2500);

}



// =====================================
// START
// =====================================

document.addEventListener("DOMContentLoaded", () => {

    if (!getToken())
        return;

    loginScreen.style.display = "none";
    adminPanel.style.display = "flex";

    loadStats();

    openTab("dashboard");

});
