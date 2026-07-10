const updates = document.getElementById("updates");
const updatesBtn = document.getElementById("updatesBtn");
const overlay = document.getElementById("updatesOverlay");
const updatesList = document.getElementById("updatesList");

async function loadRecentUpdates() {
    try {
        const response = await fetch(API + "/reports/recent");
        const reports = await response.json();

        updatesList.innerHTML = "";

        if (reports.length === 0) {
            updatesList.innerHTML = "<p class='no-updates'>Пока нет комментариев</p>";
            return;
        }

        reports.forEach(r => {
            const item = document.createElement("div");
            item.className = "station";
            item.innerHTML = `
                <div class="update-main">${escapeHtmlUpd(r.author)} (${escapeHtmlUpd(r.station_name)}) — ${escapeHtmlUpd(r.comment)}</div>
                <button class="reply-toggle" data-report-id="${r.id}">💬 Ответить ${r.comment_count > 0 ? `(${r.comment_count})` : ""}</button>
                <div class="thread" id="thread-${r.id}" style="display:none;"></div>
            `;
            updatesList.appendChild(item);
        });

        document.querySelectorAll(".reply-toggle").forEach(btn => {
            btn.addEventListener("click", () => toggleThread(btn.dataset.reportId));
        });

    } catch (err) {
        console.error(err);
        updatesList.innerHTML = "<p class='no-updates'>Ошибка загрузки</p>";
    }
}

async function toggleThread(reportId) {
    const thread = document.getElementById(`thread-${reportId}`);

    if (thread.style.display === "block") {
        thread.style.display = "none";
        return;
    }

    thread.style.display = "block";
    thread.innerHTML = "<p class='thread-loading'>Загрузка...</p>";

    const comments = await fetchComments(reportId);
    renderThread(reportId, comments);
}

async function fetchComments(reportId) {
    try {
        const response = await fetch(API + `/reports/${reportId}/comments`);
        return await response.json();
    } catch (err) {
        return [];
    }
}

function renderThread(reportId, comments) {
    const thread = document.getElementById(`thread-${reportId}`);

    const commentsHtml = comments.map(c => `
        <div class="thread-comment">
            <strong>${escapeHtmlUpd(c.author)}</strong>: ${escapeHtmlUpd(c.text)}
            <span class="thread-date">${escapeHtmlUpd(c.created_at || "")}</span>
        </div>
    `).join("");

    thread.innerHTML = `
        <div class="thread-comments">${commentsHtml || "<p class='no-updates'>Пока нет ответов</p>"}</div>
        <div class="thread-form">
            <input type="text" placeholder="Ваш ответ..." class="thread-input" id="thread-input-${reportId}">
            <button class="thread-send" data-report-id="${reportId}">Отправить</button>
        </div>
    `;

    document.querySelector(`.thread-send[data-report-id="${reportId}"]`).addEventListener("click", () => {
        sendComment(reportId);
    });

    document.getElementById(`thread-input-${reportId}`).addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendComment(reportId);
    });
}

async function sendComment(reportId) {
    const input = document.getElementById(`thread-input-${reportId}`);
    const text = input.value.trim();

    if (!text) return;

    try {
        const response = await fetch(API + `/reports/${reportId}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            alert("Не удалось отправить ответ");
            return;
        }

        input.value = "";
        const comments = await fetchComments(reportId);
        renderThread(reportId, comments);

    } catch (err) {
        alert("Ошибка подключения");
    }
}

function escapeHtmlUpd(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
}

updatesBtn.onclick = () => {
    loadRecentUpdates();
    updates.classList.add("open");
    overlay.classList.add("show");
};

overlay.onclick = () => {
    updates.classList.remove("open");
    overlay.classList.remove("show");
};
