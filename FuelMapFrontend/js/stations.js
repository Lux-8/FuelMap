async function loadStations() {
    const response = await fetch(API + "/stations");
    stations = await response.json();
    drawStations();
}

async function loadStation(id) {
    const response = await fetch(API + "/station/" + id);
    const station = await response.json();

    // обновляем локальный кэш, чтобы карта и панель были консистентны
    stations = stations.map(s => (s.id === station.id ? station : s));

    return station;
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