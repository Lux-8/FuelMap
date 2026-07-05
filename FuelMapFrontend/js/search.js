const search=document.getElementById("search");

search.addEventListener("input",()=>{

    const text=search.value.toLowerCase();

    Object.values(stationMarkers).forEach(marker=>{

        marker.setStyle({

            opacity:1,

            fillOpacity:1

        });

    });

});