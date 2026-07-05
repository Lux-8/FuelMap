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