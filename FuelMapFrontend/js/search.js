const searchInput = document.getElementById("search");

searchInput.addEventListener("input", () => {
    searchText = searchInput.value.trim().toLowerCase();
    updateMarkerVisibility();
});