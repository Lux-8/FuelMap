const modal = document.getElementById("reportModal");
const closeModal = document.querySelector(".close");

closeModal.onclick = () => {
    modal.style.display = "none";
};

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

function openReport(stationId) {
    currentStation = stationId;

    document.getElementById("comment").value = "";
    document.getElementById("a92").checked = false;
    document.getElementById("a95").checked = false;
    document.getElementById("a98").checked = false;
    document.getElementById("diesel").checked = false;
    document.getElementById("gas").checked = false;

    modal.style.display = "block";
}

async function sendReport() {
    try {
        const response = await fetch(API + "/report", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                station_id: currentStation,
                a92: document.getElementById("a92").checked,
                a95: document.getElementById("a95").checked,
                a98: document.getElementById("a98").checked,
                diesel: document.getElementById("diesel").checked,
                gas: document.getElementById("gas").checked,
                comment: document.getElementById("comment").value,
                author: getUsername()
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