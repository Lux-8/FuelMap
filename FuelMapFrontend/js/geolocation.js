const locateBtn = document.getElementById("locateBtn");

locateBtn.onclick = () => {

    if (!navigator.geolocation) {
        alert("Геолокация не поддерживается браузером.");
        return;
    }

    locateBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            map.setView([lat, lng], 14);

            if (myMarker) {
                myMarker.setLatLng([lat, lng]);
            } else {
                myMarker = L.circleMarker([lat, lng], {
                    radius: 8,
                    color: "#3388ff",
                    fillColor: "#3388ff",
                    fillOpacity: 0.9,
                    weight: 2
                }).addTo(map);
            }

            locateBtn.disabled = false;
        },
        (err) => {
            locateBtn.disabled = false;

            if (err.code === err.PERMISSION_DENIED) {
                alert("Доступ к геолокации запрещён. Разреши в настройках браузера.");
            } else {
                alert("Не удалось определить местоположение.");
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
};