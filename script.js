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
    name:"Сургутнефтегаз",
    lat:56.24039261057809,
    lng:34.346330946165786,
    color:"gray",
    text:"Информация неизвестна"
},

{
    name:"Лукойл",
    lat:56.21902736710762,
    lng:34.347892229910876,
    color:"gray",
    text:"Информация неизвестна"
},

{
    name:"Лукойл",
    lat:56.218025159517076,
    lng:34.26597238251993,
    color:"gray",
    text:"Информация неизвестна"
},

{
    name:"НТК",
    lat:56.21476482081317,
    lng:34.19804830648347,
    color:"gray",
    text:"Информация неизвестна"
},

{
    name:"Gulf",
    lat:56.25877834761983,
    lng:34.32787759213527,
    color:"gray",
    text:"Информация неизвестна"
},

{
    name:"Сургутнефтегаз",
    lat:56.28624341530939,
    lng:34.28584274442976,
    color:"gray",
    text:"Информация неизвестна"
},

{
    name:"Teboil",
    lat:56.17752420607953,
    lng:34.56343959840885,
    color:"gray",
    text:"Информация неизвестна"
},

{
    name:"Роснефть",
    lat:56.15678394673606,
    lng:34.6422773029188,
    color:"gray",
    text:"Информация неизвестна"
},

{
    name:"Роснефть",
    lat:56.15852864431529,
    lng:34.63575273728923,
    color:"gray",
    text:"Информация неизвестна"
},

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

map.on('click', function(e) {

    console.log(
        "Широта:", e.latlng.lat,
        "Долгота:", e.latlng.lng
    );

});