function createMap(){

    map = L.map("map",{

        attributionControl:false

    }).setView([56.8596,35.9119],8);

    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

    ).addTo(map);

    markers=L.markerClusterGroup();

    map.addLayer(markers);

}

function createMap(){

    map = L.map("map", {
        attributionControl:false
    }).setView([56.8596,35.9119],8);


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    ).addTo(map);


    markers = L.markerClusterGroup();

    map.addLayer(markers);

//Этот секретный маркер добавим позже
    //const secretMarker = L.marker([56.9057, 35.7215]);

    //secretMarker.addTo(map);


    //secretMarker.bindPopup(`
        //<h3>🟣 FuelMap Secret Base</h3>

        //<p>
        //🎉 Вы нашли секретную точку FuelMap!
        //</p>

        //<p>
        //🚗 Первый исследователь Тверской области
        //</p>

        //<b>🏆 Достижение получено</b>
    //`);
}
