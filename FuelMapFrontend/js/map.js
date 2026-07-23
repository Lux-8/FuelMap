function createMap() {

    map = L.map("map", {
        attributionControl: false
    }).setView([56.8596, 35.9119], 8);

    L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
            subdomains: "abcd",
            maxZoom: 20,
            attribution: "&copy; OpenStreetMap &copy; CARTO"
        }
    ).addTo(map);

    markers = L.markerClusterGroup();

    map.addLayer(markers);

    map.on("click", (e) => {
        const { lat, lng } = e.latlng;

        console.log("lat:", lat);
        console.log("lng:", lng);
    });

}
