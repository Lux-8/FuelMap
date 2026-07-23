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
    Authorization: `Bearer ${getToken()}`,
  };
}

async function api(url, options = {}) {
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...getHeaders(),
    },
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
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      adminLoginError.textContent = data.detail || "Ошибка входа";

      return;
    }

    localStorage.setItem(TOKEN_KEY, data.token);

    loginScreen.style.display = "none";
    adminPanel.style.display = "flex";

    await loadStats();
  } catch (err) {
    console.error(err);

    adminLoginError.textContent = "Сервер недоступен";
  }
}

if (adminLoginBtn) {
  adminLoginBtn.onclick = login;
}

if (adminPassword) {
  adminPassword.addEventListener("keydown", (e) => {
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
  if (!getToken()) return;

  loginScreen.style.display = "none";
  adminPanel.style.display = "flex";

  await loadStats();
});

// =====================================
// PAGINATION / SEARCH STATE
// =====================================

const pageState = {
  users: { page: 1, q: "" },
  stations: { page: 1, q: "", status: "" },
  reports: { page: 1 },
  visits: { page: 1 },
};

/**
 * Рисует кнопки "Назад / стр X из Y / Вперёд" в контейнере containerId
 * и вызывает onPageChange(newPage) при клике.
 */
function renderPagination(containerId, total, page, pageSize, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "← Назад";
  prevBtn.disabled = page <= 1;
  prevBtn.onclick = () => onPageChange(page - 1);

  const info = document.createElement("span");
  info.className = "admin-page-info";
  info.textContent = `Стр. ${page} из ${totalPages} (всего: ${total})`;

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Вперёд →";
  nextBtn.disabled = page >= totalPages;
  nextBtn.onclick = () => onPageChange(page + 1);

  container.appendChild(prevBtn);
  container.appendChild(info);
  container.appendChild(nextBtn);
}

/** Простой debounce для полей поиска, чтобы не долбить API на каждую букву. */
function debounce(fn, delay = 350) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

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

  "achievements",
];

let currentTab = "dashboard";

function openTab(tab, event = null) {
  currentTab = tab;

  tabs.forEach((name) => {
    const page = document.getElementById(name + "Tab");

    if (page) page.style.display = "none";
  });

  const current = document.getElementById(tab + "Tab");

  if (current) current.style.display = "block";

  document
    .querySelectorAll(".admin-menu button")
    .forEach((btn) => btn.classList.remove("active"));

  if (event) event.target.classList.add("active");

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

    case "analytics":
      loadAnalytics();
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

    document.getElementById("statUsers").textContent = data.users ?? 0;

    document.getElementById("statStations").textContent = data.stations ?? 0;

    document.getElementById("statReports").textContent = data.reports ?? 0;

    document.getElementById("statOnline").textContent = data.online ?? 0;

    const blockedEl = document.getElementById("statBlocked");
    if (blockedEl) blockedEl.textContent = data.blocked_users ?? 0;
  } catch (err) {
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

  const { page, q } = pageState.users;
  const params = new URLSearchParams({ page, page_size: 20 });
  if (q) params.set("q", q);

  try {
    const response = await api(`/admin/users?${params}`);

    const data = await response.json();
    const users = data.items || [];

    const totalEl = document.getElementById("usersTotal");
    if (totalEl) totalEl.textContent = `Всего: ${data.total}`;

    table.innerHTML = "";

    table.innerHTML += `
        <div class="admin-row" style="grid-template-columns: 0.5fr 1.5fr 2fr 1.3fr 1fr 1fr auto;">
            <b>ID</b>
            <b>Имя</b>
            <b>Email</b>
            <b>Регистрация</b>
            <b>Статус</b>
            <b>Вход</b>
            <b>Действия</b>
        </div>
        `;

    if (users.length === 0) {
      table.innerHTML += `<div class="admin-row">Ничего не найдено</div>`;
    }

    users.forEach((user) => {
      table.innerHTML += `
            <div class="admin-row" style="grid-template-columns: 0.5fr 1.5fr 2fr 1.3fr 1fr 1fr auto;">

                <span>#${user.id}</span>

                <span>${user.name || "Без имени"}</span>

                <span>${user.email}</span>

                <span>${user.created_at || "-"}</span>

                <span>
                    ${
                      user.is_blocked
                        ? '<span class="badge badge-red">Заблокирован</span>'
                        : '<span class="badge badge-green">Активен</span>'
                    }
                </span>

                <span>
                    ${
                      user.via_google
                        ? '<span class="badge badge-gray">Google</span>'
                        : '<span class="badge badge-gray">Email</span>'
                    }
                </span>

                <div>

                    <button
                        class="admin-btn"
                        onclick="openUserModal(${user.id})">

                        Открыть

                    </button>

                </div>

            </div>
            `;
    });

    renderPagination(
      "usersPagination",
      data.total,
      data.page,
      data.page_size,
      (p) => {
        pageState.users.page = p;
        loadUsers();
      },
    );
  } catch (err) {
    console.error(err);

    table.innerHTML = "Ошибка загрузки пользователей";
  }
}

const usersSearchInput = document.getElementById("usersSearch");
if (usersSearchInput) {
  usersSearchInput.addEventListener(
    "input",
    debounce(() => {
      pageState.users.q = usersSearchInput.value.trim();
      pageState.users.page = 1;
      loadUsers();
    }),
  );
}

// =====================================
// USER MODAL
// =====================================

async function openUserModal(id) {
  try {
    const response = await api(`/admin/users/${id}`);

    const user = await response.json();

    const modal = document.getElementById("userModal");

    const content = document.getElementById("userModalContent");

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
                    <b>Регистрация</b><br>
                    ${user.created_at}
                </div>

                <div>
                    <b>Google</b><br>
                    ${user.via_google ? "Да" : "Нет"}
                </div>

                <div>
                    <b>Статус</b><br>
                    ${user.is_blocked ? "🔴 Заблокирован" : "🟢 Активен"}
                </div>

                <div>
                    <b>Последний вход</b><br>
                    ${user.last_login || "—"}
                </div>

                <div>
                    <b>Репортов отправлено</b><br>
                    ${user.reports_count ?? 0}
                </div>

                <div
                    style="
                        display:flex;
                        gap:10px;
                        flex-wrap:wrap;
                        margin-top:15px;
                    ">

                    ${
                      user.is_blocked
                        ? `<button
                            class="admin-btn"
                            onclick="unblockUser(${user.id})">
                            Разблокировать
                        </button>`
                        : `<button
                            class="admin-btn"
                            onclick="blockUser(${user.id})">
                            Заблокировать
                        </button>`
                    }

                    <button
                        class="admin-btn"
                        style="background:#dc2626"
                        onclick="deleteUser(${user.id})">

                        Удалить

                    </button>

                </div>

            </div>

        `;

    modal.style.display = "flex";
  } catch (err) {
    console.error(err);

    showMessage("Ошибка загрузки пользователя");
  }
}

// =====================================
// USER ACTIONS
// =====================================

async function blockUser(id) {
  if (!confirm("Заблокировать пользователя?")) return;

  await api(`/admin/users/${id}/block`, {
    method: "PUT",
  });

  showMessage("Пользователь заблокирован");
  await openUserModal(id);
  loadUsers();
}

async function unblockUser(id) {
  await api(`/admin/users/${id}/unblock`, {
    method: "PUT",
  });

  showMessage("Пользователь разблокирован");
  await openUserModal(id);
  loadUsers();
}

async function deleteUser(id) {
  if (!confirm("Удалить пользователя?")) return;

  await api(`/admin/users/${id}`, {
    method: "DELETE",
  });

  closeUserModal();

  loadUsers();
}

// =====================================
// STATIONS
// =====================================

function statusBadge(status) {
  if (status === "green")
    return '<span class="badge badge-green">🟢 Есть топливо</span>';
  if (status === "orange")
    return '<span class="badge badge-orange">🟠 Очередь</span>';
  return '<span class="badge badge-gray">⚪ Нет топлива</span>';
}

function fuelTags(fuel) {
  const labels = {
    a92: "АИ-92",
    a95: "АИ-95",
    a98: "АИ-98",
    diesel: "ДТ",
    gas: "Газ",
  };

  return `<div class="fuel-tags">${Object.entries(labels)
    .map(
      ([key, label]) =>
        `<span class="fuel-tag ${fuel[key] ? "active" : ""}">${label}</span>`,
    )
    .join("")}</div>`;
}

async function loadStations() {
  const table = document.getElementById("stationsTable");

  if (!table) return;

  table.innerHTML = "Загрузка...";

  const { page, q, status } = pageState.stations;
  const params = new URLSearchParams({ page, page_size: 20 });
  if (q) params.set("q", q);
  if (status) params.set("status", status);

  try {
    const response = await api(`/admin/stations?${params}`);

    const data = await response.json();
    const stations = data.items || [];

    const totalEl = document.getElementById("stationsTotal");
    if (totalEl) totalEl.textContent = `Всего: ${data.total}`;

    table.innerHTML = `
            <div class="admin-row" style="grid-template-columns: 0.5fr 1.6fr 1.8fr 1.3fr 1.8fr 1.2fr auto;">
                <b>ID</b>
                <b>Название</b>
                <b>Адрес</b>
                <b>Статус</b>
                <b>Топливо</b>
                <b>Обновлено</b>
                <b>Действия</b>
            </div>
        `;

    if (stations.length === 0) {
      table.innerHTML += `<div class="admin-row">Ничего не найдено</div>`;
    }

    stations.forEach((station) => {
      table.innerHTML += `
                <div class="admin-row" style="grid-template-columns: 0.5fr 1.6fr 1.8fr 1.3fr 1.8fr 1.2fr auto;">

                    <span>#${station.id}</span>

                    <span title="Координаты: ${station.lat}, ${station.lng}">${station.name}</span>

                    <span>${station.address || "—"}</span>

                    <span>${statusBadge(station.status)}</span>

                    <span>${fuelTags(station.fuel)}</span>

                    <span>${station.updated_at || "—"}</span>

                    <div>

                        <button
                            class="admin-btn"
                            style="background:#dc2626"
                            onclick="deleteStation(${station.id})">

                            Удалить

                        </button>

                    </div>

                </div>
            `;
    });

    renderPagination(
      "stationsPagination",
      data.total,
      data.page,
      data.page_size,
      (p) => {
        pageState.stations.page = p;
        loadStations();
      },
    );
  } catch (err) {
    console.error(err);

    table.innerHTML = "Ошибка загрузки";
  }
}

const stationsSearchInput = document.getElementById("stationsSearch");
if (stationsSearchInput) {
  stationsSearchInput.addEventListener(
    "input",
    debounce(() => {
      pageState.stations.q = stationsSearchInput.value.trim();
      pageState.stations.page = 1;
      loadStations();
    }),
  );
}

const stationsStatusFilter = document.getElementById("stationsStatusFilter");
if (stationsStatusFilter) {
  stationsStatusFilter.addEventListener("change", () => {
    pageState.stations.status = stationsStatusFilter.value;
    pageState.stations.page = 1;
    loadStations();
  });
}

// =====================================
// STATIONS — добавление вручную
// =====================================

async function createStation() {
  const name = document.getElementById("newStationName").value.trim();
  const address = document.getElementById("newStationAddress").value.trim();
  const lat = parseFloat(document.getElementById("newStationLat").value);
  const lng = parseFloat(document.getElementById("newStationLng").value);

  const errorEl = document.getElementById("newStationError");
  if (errorEl) errorEl.textContent = "";

  if (!name || isNaN(lat) || isNaN(lng)) {
    if (errorEl)
      errorEl.textContent = "Заполните название и корректные координаты";
    return;
  }

  try {
    const response = await api("/admin/stations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address: address || null, lat, lng }),
    });

    if (!response.ok) {
      if (errorEl) errorEl.textContent = "Ошибка при создании заправки";
      return;
    }

    document.getElementById("newStationName").value = "";
    document.getElementById("newStationAddress").value = "";
    document.getElementById("newStationLat").value = "";
    document.getElementById("newStationLng").value = "";

    loadStations();
    loadStats();
  } catch (err) {
    console.error(err);
    if (errorEl) errorEl.textContent = "Ошибка подключения";
  }
}

async function deleteStation(id) {
  if (!confirm("Удалить заправку?")) return;

  try {
    await api(`/admin/stations/${id}`, {
      method: "DELETE",
    });

    loadStations();

    loadStats();
  } catch (err) {
    console.error(err);

    alert("Не удалось удалить");
  }
}

// =====================================
// REPORTS
// =====================================

async function loadReports() {
  const table = document.getElementById("reportsTable");

  if (!table) return;

  table.innerHTML = "Загрузка...";

  const { page } = pageState.reports;
  const params = new URLSearchParams({ page, page_size: 20 });

  try {
    const response = await api(`/admin/reports?${params}`);

    const data = await response.json();
    const reports = data.items || [];

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

    reports.forEach((report) => {
      table.innerHTML += `
                <div class="admin-row">

                    <span>
                        #${report.id}
                    </span>

                    <span>
                        ${report.station_name}
                        ${report.has_queue ? '<br><span class="badge badge-orange">Очередь</span>' : ""}
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

                    <div style="display:flex; gap:6px;">

                        <button
                            class="admin-btn"
                            onclick="toggleAdminComments(${report.id})">

                            Ответы

                        </button>

                        <button
                            class="admin-btn"
                            style="background:#dc2626"
                            onclick="deleteReport(${report.id})">

                            Удалить

                        </button>

                    </div>

                </div>

                <div
                    id="admin-comments-${report.id}"
                    style="display:none; padding:10px 0 10px 20px;">
                </div>
            `;
    });

    renderPagination(
      "reportsPagination",
      data.total,
      data.page,
      data.page_size,
      (p) => {
        pageState.reports.page = p;
        loadReports();
      },
    );
  } catch (err) {
    console.error(err);

    table.innerHTML = "Ошибка загрузки репортов";
  }
}

// =====================================
// REPORTS — комментарии (ответы) внутри репорта
// =====================================

async function toggleAdminComments(reportId) {
  const box = document.getElementById(`admin-comments-${reportId}`);
  if (!box) return;

  if (box.style.display === "block") {
    box.style.display = "none";
    return;
  }

  box.style.display = "block";
  box.innerHTML = "Загрузка...";

  try {
    const response = await api(`/admin/reports/${reportId}/comments`);
    const comments = await response.json();

    if (comments.length === 0) {
      box.innerHTML = "<i>Нет ответов</i>";
      return;
    }

    box.innerHTML = comments
      .map(
        (c) => `
            <div class="admin-row" style="grid-template-columns:1fr 2fr 1fr auto;">
                <span>${c.author}</span>
                <span>${c.text}</span>
                <span>${c.created_at || ""}</span>
                <button
                    class="admin-btn"
                    style="background:#dc2626"
                    onclick="deleteAdminComment(${c.id}, ${reportId})">
                    Удалить
                </button>
            </div>
        `,
      )
      .join("");
  } catch (err) {
    console.error(err);
    box.innerHTML = "Ошибка загрузки ответов";
  }
}

async function deleteAdminComment(commentId, reportId) {
  if (!confirm("Удалить этот ответ?")) return;

  try {
    await api(`/admin/comments/${commentId}`, { method: "DELETE" });

    // перерисовываем список комментариев этого репорта
    const box = document.getElementById(`admin-comments-${reportId}`);
    box.style.display = "none";
    toggleAdminComments(reportId);
  } catch (err) {
    console.error(err);
    alert("Не удалось удалить ответ");
  }
}

async function deleteReport(id) {
  if (!confirm("Удалить репорт?")) return;

  try {
    await api(`/admin/reports/${id}`, {
      method: "DELETE",
    });

    loadReports();

    loadStats();
  } catch (err) {
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

  const { page } = pageState.visits;
  const params = new URLSearchParams({ page, page_size: 20 });

  try {
    const response = await api(`/admin/visits?${params}`);

    const data = await response.json();
    const visits = data.items || [];

    table.innerHTML = `

            <h3 style="margin-bottom:20px">
                Всего посещений: ${data.total}
            </h3>

            <div class="admin-row">
                <b>IP</b>
                <b>Браузер</b>
                <b>Устройство</b>
                <b>Дата</b>
            </div>

        `;

    visits.forEach((v) => {
      table.innerHTML += `

                <div class="admin-row">

                    <span>${v.ip}</span>

                    <span>${v.browser}</span>

                    <span>${v.device}</span>

                    <span>${v.created_at}</span>

                </div>

            `;
    });

    renderPagination(
      "visitsPagination",
      data.total,
      data.page,
      data.page_size,
      (p) => {
        pageState.visits.page = p;
        loadVisits();
      },
    );
  } catch (err) {
    console.error(err);

    table.innerHTML = "Ошибка загрузки посещений";
  }
}

// =====================================
// ANALYTICS
// =====================================

async function loadAnalytics() {
  try {
    const response = await api("/admin/analytics");

    const data = await response.json();

    const todayEl = document.getElementById("analyticsToday");
    const weekEl = document.getElementById("analyticsWeek");
    const monthEl = document.getElementById("analyticsMonth");

    if (todayEl) todayEl.textContent = data.today ?? 0;
    if (weekEl) weekEl.textContent = data.week ?? 0;
    if (monthEl) monthEl.textContent = data.month ?? 0;

    const chart = document.getElementById("analyticsChart");
    if (!chart) return;

    const days = data.last_days || [];

    if (days.length === 0) {
      chart.innerHTML = "<p>Пока нет данных о посещениях</p>";
      return;
    }

    const max = Math.max(...days.map((d) => d.count), 1);

    chart.innerHTML = days
      .map((d) => {
        const heightPct = Math.max(4, Math.round((d.count / max) * 100));
        const shortDate = d.date.slice(0, 5); // dd.mm
        return `
                <div class="analytics-chart-bar-wrap">
                    <span class="analytics-chart-count">${d.count}</span>
                    <div class="analytics-chart-bar" style="height:${heightPct}%"></div>
                    <span class="analytics-chart-label">${shortDate}</span>
                </div>
            `;
      })
      .join("");
  } catch (err) {
    console.error(err);
  }
}

// =====================================
// NOTIFICATIONS
// =====================================

function showMessage(text) {
  const div = document.createElement("div");

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
// АВТООБНОВЛЕНИЕ КАЖДЫЕ 15 СЕКУНД
// =====================================

function isUserTyping() {
  const el = document.activeElement;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA";
}

function refreshCurrentTab() {
  // не дёргаем интерфейс, если человек сейчас что-то вводит
  // (например, заполняет форму новой заправки)
  if (isUserTyping()) return;

  // не обновляем, если открыто модальное окно с карточкой пользователя —
  // иначе список за модалкой перерисуется, а модалка останется как есть, это ок,
  // но саму модалку трогать не будем
  loadStats();

  switch (currentTab) {
    case "users":
      loadUsers();
      break;
    case "stations":
      loadStations();
      break;
    case "reports":
      // не перерисовываем таблицу репортов, если у кого-то открыт
      // список ответов под репортом — иначе он схлопнется на каждое обновление
      const anyThreadOpen = Array.from(
        document.querySelectorAll('[id^="admin-comments-"]'),
      ).some((el) => el.style.display === "block");

      if (!anyThreadOpen) {
        loadReports();
      }
      break;
    case "visits":
      loadVisits();
      break;
    case "analytics":
      loadAnalytics();
      break;
  }
}

setInterval(refreshCurrentTab, 15000);

// =====================================
// START
// =====================================

document.addEventListener("DOMContentLoaded", () => {
  if (!getToken()) return;

  loginScreen.style.display = "none";
  adminPanel.style.display = "flex";

  loadStats();

  openTab("dashboard");
});
