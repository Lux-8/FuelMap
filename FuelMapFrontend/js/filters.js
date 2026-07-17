let activeFuelFilter = null;
let searchText = "";

const filterButtons = document.querySelectorAll(".filters button");

const filterMap = {
    "92": "a92",
    "95": "a95",
    "98": "a98",
    "ДТ": "diesel",
    "Газ": "gas"
};

filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const label = btn.textContent.trim();
        activeFuelFilter = label === "Все" ? null : filterMap[label];

        updateMarkerVisibility();
    });
});

function updateMarkerVisibility() {
    stations.forEach(station => {
        const marker = stationMarkers[station.id];
        if (!marker) return;

        const passesFuelFilter =
            !activeFuelFilter || station.fuel[activeFuelFilter];

        const searchData = `${station.name || ""} ${station.address || ""}`
            .toLowerCase();

        const passesSearch =
            searchText === "" || searchData.includes(searchText);

        const visible = passesFuelFilter && passesSearch;
        const isInCluster = markers.hasLayer(marker);

        if (visible && !isInCluster) {
            markers.addLayer(marker);
        } else if (!visible && isInCluster) {
            markers.removeLayer(marker);
        }
    });
}