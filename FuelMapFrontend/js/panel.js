const panel = document.getElementById("stationPanel");

function fuelLine(label, available, price) {
    const cls = available ? "available" : "unavailable";
    const status = available
        ? (price ? `${price}₽` : "✓ есть")
        : "нет";

    return `
        <div class="fuel-chip ${cls}">
            <span class="fuel-chip-label">${label}</span>
            <span class="fuel-chip-status">${status}</span>
        </div>
    `;
}

function queueLine(hasQueue, rating) {
    if (hasQueue === null || hasQueue === undefined) return "";

    if (!hasQueue) {
        return `
            <div class="queue-status">
                <span>🚗 Очереди нет</span>
            </div>
        `;
    }

    const stars = rating
        ? "★".repeat(rating) + "☆".repeat(5 - rating)
        : "";

    return `
        <div class="queue-status">
            <span>🚗 Есть очередь</span>
            ${stars ? `<span class="stars">${stars}</span>` : ""}
        </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) return "Нет информации";

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function openStationPanel(station) {
    if (!station) return;

    currentStation = station.id;

    document.getElementById("panelName").textContent = station.name || "Без названия";

    document.getElementById("panelAddress").textContent =
        station.address || "📍 Адрес неизвестен";

    document.getElementById("panelStatus").textContent = station.text || "";

    const updated = document.getElementById("panelUpdated");

    updated.textContent = station.updated_at
        ? "🕒 Последнее изменение: " + formatDate(station.updated_at)
        : "🕒 Нет информации";

    const fuel = station.fuel || {};

    document.getElementById("panelFuel").innerHTML =
        fuelLine("АИ-92", fuel.a92, station.price_a92) +
        fuelLine("АИ-95", fuel.a95, station.price_a95) +
        fuelLine("АИ-98", fuel.a98, station.price_a98) +
        fuelLine("ДТ", fuel.diesel, station.price_diesel) +
        fuelLine("Газ", fuel.gas, station.price_gas) +
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
