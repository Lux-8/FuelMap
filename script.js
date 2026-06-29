// Создаем карту
const map = L.map('map').setView([56.8596, 35.9119], 8);

// Карта OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

// ======================
// Заправки
// ======================

const stations = [

{
    name:"Лукойл",
    lat:56.8596,
    lng:35.9119,
    color:"green",
    text:"Есть всё топливо"
},

{
    name:"Газпромнефть",
    lat:56.262,
    lng:34.328,
    color:"orange",
    text:"Только дизель"
},

{
    name:"Роснефть",
    lat:57.583,
    lng:34.564,
    color:"red",
    text:"Топлива нет"
}

];

// Добавляем все заправки
stations.forEach(station=>{

    let color="gray";

    if(station.color==="green") color="green";
    if(station.color==="orange") color="orange";
    if(station.color==="red") color="red";

    L.circleMarker([station.lat,station.lng],{

        radius:10,
        color:color,
        fillColor:color,
        fillOpacity:1

    })
    .addTo(map)
    .bindPopup(`
        <b>${station.name}</b><br>
        ${station.text}
    `);

});