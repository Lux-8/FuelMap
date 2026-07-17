const searchInput = document.getElementById("search");

searchInput.addEventListener("input", (e) => {
    searchText = e.target.value
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

    updateMarkerVisibility();
});