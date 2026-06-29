
// ===============================
// Карта
// ===============================

const map = L.map("map", {
    attributionControl: false
}).setView([56.8596, 35.9119], 8);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

L.control.attribution({
    prefix: false
}).addTo(map);

// ===============================
// Кластеры
// ===============================

const markers = L.markerClusterGroup();

// ===============================
// Цвет по умолчанию (пока нет данных)
// ===============================

function getColor(tags) {
    // пока ВСЕ серые, позже ты подключишь реальные статусы
    return "#95a5a6";
}

// ===============================
// Overpass API (все АЗС Тверской области)
// ===============================

const query = `
[out:json][timeout:30];
area["name"="Тверская область"]->.a;
(
  node["amenity"="fuel"](area.a);
  way["amenity"="fuel"](area.a);
  relation["amenity"="fuel"](area.a);
);
out center;
`;

fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query
})
.then(res => res.json())
.then(data => {

    data.elements.forEach(el => {

        const lat = el.lat || el.center?.lat;
        const lng = el.lon || el.center?.lon;

        if (!lat || !lng) return;

        const name = el.tags?.name || "АЗС без названия";

        const color = getColor(el.tags);

        // ===============================
        // КРУЖОЧЕК вместо стандартного маркера
        // ===============================

        const circle = L.circleMarker([lat, lng], {
            radius: 7,
            color: color,
            fillColor: color,
            fillOpacity: 0.9,
            weight: 2
        });

        circle.bindPopup(`
            <b>⛽ ${name}</b><br>
            ⚫ Статус: неизвестно<br><br>
            💡 Скоро тут будет:
            <br>• цены
            <br>• наличие топлива
            <br>• фото пользователей
        `);

        markers.addLayer(circle);
    });

    map.addLayer(markers);

})
.catch(err => {
    console.error("Ошибка загрузки АЗС:", err);
});

// ===============================
// Координаты кликом
// ===============================

map.on("click", e => {
    console.log("lat:", e.latlng.lat, "lng:", e.latlng.lng);
});