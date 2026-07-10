const modal = document.getElementById("reportModal");
const closeModal = document.querySelector(".close");

const hasQueueCheckbox = document.getElementById("hasQueue");
const queueRatingEl = document.getElementById("queueRating");
const stars = queueRatingEl.querySelectorAll("span");

let selectedQueueRating = 0;

closeModal.onclick = () => {
    modal.style.display = "none";
};

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

hasQueueCheckbox.addEventListener("change", () => {
    if (hasQueueCheckbox.checked) {
        queueRatingEl.style.display = "block";
    } else {
        queueRatingEl.style.display = "none";
        selectedQueueRating = 0;
        updateStarDisplay();
    }
});

stars.forEach(star => {
    star.addEventListener("click", () => {
        selectedQueueRating = parseInt(star.dataset.value);
        updateStarDisplay();
    });
});

function updateStarDisplay() {
    stars.forEach(star => {
        const value = parseInt(star.dataset.value);
        star.classList.toggle("active", value <= selectedQueueRating);
    });
}

function openReport(stationId) {
    currentStation = stationId;

    document.getElementById("comment").value = "";
    document.getElementById("a92").checked = false;
    document.getElementById("a95").checked = false;
    document.getElementById("a98").checked = false;
    document.getElementById("diesel").checked = false;
    document.getElementById("gas").checked = false;

    document.getElementById("price_a92").value = "";
    document.getElementById("price_a95").value = "";
    document.getElementById("price_a98").value = "";
    document.getElementById("price_diesel").value = "";
    document.getElementById("price_gas").value = "";

    hasQueueCheckbox.checked = false;
    queueRatingEl.style.display = "none";
    selectedQueueRating = 0;
    updateStarDisplay();

    modal.style.display = "block";
}

function parsePrice(elementId) {
    const raw = document.getElementById(elementId).value.trim();
    if (raw === "") return null;

    const num = parseFloat(raw);
    return isNaN(num) ? null : num;
}

async function sendReport() {
    try {
        const response = await fetch(API + "/report", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify({
                station_id: currentStation,
                a92: document.getElementById("a92").checked,
                a95: document.getElementById("a95").checked,
                a98: document.getElementById("a98").checked,
                diesel: document.getElementById("diesel").checked,
                gas: document.getElementById("gas").checked,
                comment: document.getElementById("comment").value,
                price_a92: parsePrice("price_a92"),
                price_a95: parsePrice("price_a95"),
                price_a98: parsePrice("price_a98"),
                price_diesel: parsePrice("price_diesel"),
                price_gas: parsePrice("price_gas"),
                has_queue: hasQueueCheckbox.checked,
                queue_rating: hasQueueCheckbox.checked && selectedQueueRating > 0 ? selectedQueueRating : null
            })
        });

        if (!response.ok) {
            alert("Ошибка сервера");
            return;
        }

        const station = await loadStation(currentStation);

        openStationPanel(station);

        stationMarkers[station.id].setStyle({
            color: getColor(station.status),
            fillColor: getColor(station.status)
        });

        modal.style.display = "none";
        alert("Спасибо!");

    } catch (err) {
        console.error(err);
        alert("Ошибка подключения.");
    }
}

document.getElementById("sendReport").addEventListener("click", sendReport);
