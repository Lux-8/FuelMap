const panel = document.getElementById("stationPanel");

function fuelLine(label, available, price) {
    const icon = available ? "✅" : "❌";
    const priceText = (available && price) ? ` — ${price}₽` : "";
    return `<p>${label} ${icon}${priceText}</p>`;
}

function queueLine(hasQueue, rating) {
    if (hasQueue === null || hasQueue === undefined) return "";

    if (!hasQueue) {
        return `<p>🚗 Очереди нет</p>`;
    }

    const stars = rating ? "★".repeat(rating) + "☆".repeat(5 - rating) : "";
    return `<p>🚗 Есть очередь ${stars}</p>`;
}

function timeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);

    const diff = Math.floor((now - date) / 1000);

    const minutes = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(diff / 86400);

    if (minutes < 1) return "только что";
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} дн назад`;
}

function openStationPanel(station) {
    currentStation = station.id;

    document.getElementById("panelName").textContent = station.name;

    document.getElementById("panelAddress").textContent =
        station.address || "Адрес неизвестен";

    document.getElementById("panelStatus").textContent = station.text;

    const updated = document.getElementById("panelUpdated");

    if (station.updated_at) {
    updated.textContent = "🕒 Последнее изменение: " + timeAgo(station.updated_at);
    } else {
        updated.textContent = "🕒 Нет информации";
    }

    document.getElementById("panelFuel").innerHTML =
        fuelLine("АИ-92", station.fuel.a92, station.price_a92) +
        fuelLine("АИ-95", station.fuel.a95, station.price_a95) +
        fuelLine("АИ-98", station.fuel.a98, station.price_a98) +
        fuelLine("ДТ", station.fuel.diesel, station.price_diesel) +
        fuelLine("Газ", station.fuel.gas, station.price_gas) +
        queueLine(station.has_queue, station.queue_rating);

    const aiSummaryEl = document.getElementById("panelAiSummary");

    if (station.ai_summary) {
        aiSummaryEl.textContent = "🤖 " + station.ai_summary;
        aiSummaryEl.style.display = "block";
    } else {
        aiSummaryEl.style.display = "none";
    }

    panel.classList.add("open");
}

document.getElementById("closePanel").onclick = () => {
    panel.classList.remove("open");
};

document.getElementById("panelReport").onclick = () => {
    openReport(currentStation);
};
