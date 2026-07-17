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

function formatDate(dateString) {
    const date = new Date(dateString);

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function openStationPanel(station) {
    currentStation = station.id;

    document.getElementById("panelName").textContent = station.name;

    document.getElementById("panelAddress").textContent =
        station.address || "Адрес неизвестен";

    document.getElementById("panelStatus").textContent = station.text;

    const updated = document.getElementById("panelUpdated");

    if (station.updated_at) {
    updated.textContent = "🕒 Последнее изменение: " + formatDate(station.updated_at);
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
