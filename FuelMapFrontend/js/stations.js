console.log("API сейчас:", API);

async function loadStations() {
    const response = await fetch(API + "/stations");
    stations = await response.json();
    drawStations();
}

async function loadStations() {
    console.log("[loadStations] START");

    try {
        console.log("[loadStations] отправляю запрос...");

        const response = await fetch(`${API}/stations`);

        console.log("[loadStations] fetch завершился");
        console.log("status =", response.status);
        console.log("ok =", response.ok);

        const text = await response.text();

        console.log("Ответ сервера:");
        console.log(text);

    } catch (err) {
        console.error("FETCH ERROR:");
        console.error(err);
        console.error(err.name);
        console.error(err.message);
        console.error(err.stack);
    }

    console.log("[loadStations] END");
}

function drawStations() {
    markers.clearLayers();

    stations.forEach(station => {
        const marker = L.circleMarker(
            [station.lat, station.lng],
            {
                radius: 7,
                color: getColor(station.status),
                fillColor: getColor(station.status),
                fillOpacity: 1
            }
        );

        marker.on("click", () => {
            openStationPanel(station);
        });

        stationMarkers[station.id] = marker;
        markers.addLayer(marker);
    });
}
