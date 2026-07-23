console.log("API сейчас:", API);

async function loadStations() {
  console.log("[loadStations] начинаю запрос к", API + "/stations");

  try {
    const response = await fetch(API + "/stations");
    console.log("[loadStations] статус ответа:", response.status);

    stations = await response.json();
    console.log("[loadStations] получено станций:", stations.length);

    drawStations();
  } catch (err) {
    console.error("[loadStations] ОШИБКА:", err);
  }
}

async function loadStation(id) {
  const response = await fetch(API + "/station/" + id);

  const station = await response.json();

  stations = stations.map((s) => (s.id === station.id ? station : s));

  return station;
}

function drawStations() {
  console.log("[drawStations] запущена, station в массиве:", stations.length);
  console.log("[drawStations] markers существует?", typeof markers, markers);
  console.log("[drawStations] map существует?", typeof map, map);

  if (!markers) {
    console.error(
      "[drawStations] markers НЕ СУЩЕСТВУЕТ — createMap() не отработал до конца",
    );
    return;
  }

  markers.clearLayers();

  let drawn = 0;

  stations.forEach((station) => {
    try {
      const marker = L.circleMarker([station.lat, station.lng], {
        radius: 7,
        color: getColor(station.status),
        fillColor: getColor(station.status),
        fillOpacity: 1,
      });

      marker.on("click", () => {
        openStationPanel(station);
      });

      stationMarkers[station.id] = marker;
      markers.addLayer(marker);
      drawn++;
    } catch (err) {
      console.error(
        "[drawStations] ошибка на станции",
        station.id,
        station.name,
        err,
      );
    }
  });

  console.log(
    "[drawStations] реально отрисовано маркеров:",
    drawn,
    "из",
    stations.length,
  );
  console.log(
    "[drawStations] markers.getLayers().length после отрисовки:",
    markers.getLayers().length,
  );
}
