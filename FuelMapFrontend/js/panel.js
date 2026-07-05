const panel = document.getElementById("stationPanel");

function openStationPanel(station){

    currentStation = station.id;

    document.getElementById("panelName").textContent = station.name;

    document.getElementById("panelStatus").textContent =
        station.text;

    document.getElementById("panelFuel").innerHTML = `

<p>АИ-92 ${station.fuel.a92?"✅":"❌"}</p>

<p>АИ-95 ${station.fuel.a95?"✅":"❌"}</p>

<p>АИ-98 ${station.fuel.a98?"✅":"❌"}</p>

<p>ДТ ${station.fuel.diesel?"✅":"❌"}</p>

<p>Газ ${station.fuel.gas?"✅":"❌"}</p>

`;

    panel.classList.add("open");

}

document
.getElementById("closePanel")
.onclick = ()=>{

    panel.classList.remove("open");

};

document
.getElementById("panelReport")
.onclick = ()=>{

    openReport(currentStation);

};