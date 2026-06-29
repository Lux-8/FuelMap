// ===============================
// Создание карты
// ===============================

const map = L.map("map").setView([56.8596, 35.9119], 8);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
}).addTo(map);

// ===============================
// Загружаем все АЗС Тверской области
// ===============================

const query = `
[out:json][timeout:30];
area["name"="Тверская область"]->.searchArea;
(
  node["amenity"="fuel"](area.searchArea);
  way["amenity"="fuel"](area.searchArea);
  relation["amenity"="fuel"](area.searchArea);
);
out center;
`;

fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query
})
.then(response => response.json())
.then(data => {

    data.elements.forEach(station => {

        let lat = station.lat || station.center.lat;
        let lon = station.lon || station.center.lon;

        let name = "Неизвестная АЗС";

        if (station.tags && station.tags.name)
            name = station.tags.name;

        L.circleMarker([lat, lon], {
            radius: 5,
            color: "#777",
            fillColor: "#999",
            fillOpacity: 0.9,
            weight: 1
        })
        .addTo(map)
        .bindPopup(`
            <h3>${name}</h3>
            <p>⚫ Информация отсутствует</p>
        `);

    });

})
.catch(err => console.error(err));

// ===============================
// Получение координат кликом
// ===============================

map.on("click", function(e){

    console.log(
        e.latlng.lat.toFixed(6),
        e.latlng.lng.toFixed(6)
    );

});