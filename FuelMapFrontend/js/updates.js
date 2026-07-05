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
            const div = document.createElement("div");
            div.className = "station";
            div.textContent = `${r.author} (${r.station_name}) — ${r.comment}`;
            updatesList.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        updatesList.innerHTML = "<p class='no-updates'>Ошибка загрузки</p>";
    }
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