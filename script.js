// ===============================
// Создание карты
// ===============================

const map = L.map("map", {
    attributionControl: false
}).setView([56.8596, 35.9119], 8);

L.control.attribution({
    prefix: false
}).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// ===============================
// Кластеры
// ===============================

const markers = L.markerClusterGroup();

// ===============================
// Цвет кружка
// ===============================

function getColor(status) {

    switch(status){

        case "green":
            return "#2ecc71";

        case "orange":
            return "#f39c12";

        case "red":
            return "#e74c3c";

        default:
            return "#95a5a6";

    }

}

// ===============================
// Загрузка stations.json
// ===============================

fetch("stations.json")
.then(response => response.json())
.then(stations => {

    stations.forEach(station => {

        const circle = L.circleMarker(
            [station.lat, station.lng],
            {
                radius:7,
                color:getColor(station.status),
                fillColor:getColor(station.status),
                fillOpacity:1,
                weight:2
            }
        );

        circle.bindPopup(`
            <h3>${station.name}</h3>

            <b>Статус:</b> ${station.text}<br><br>

            <b>АИ-92:</b> ${station.fuel.a92 ? "✅ Есть" : "❌ Нет"}<br>
            <b>АИ-95:</b> ${station.fuel.a95 ? "✅ Есть" : "❌ Нет"}<br>
            <b>АИ-98:</b> ${station.fuel.a98 ? "✅ Есть" : "❌ Нет"}<br>
            <b>ДТ:</b> ${station.fuel.diesel ? "✅ Есть" : "❌ Нет"}<br>
            <b>Газ:</b> ${station.fuel.gas ? "✅ Есть" : "❌ Нет"}
        `);

        markers.addLayer(circle);

    });

    map.addLayer(markers);

})
.catch(error => {

    console.error("Ошибка загрузки stations.json", error);

});

// ===============================
// Координаты по клику
// ===============================

map.on("click", function(e){

    console.log(
        "lat:", e.latlng.lat,
        "lng:", e.latlng.lng
    );

});