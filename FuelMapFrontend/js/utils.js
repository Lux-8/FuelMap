function getColor(status) {
    switch (status) {
        case "green":  return "#2ecc71";
        case "orange": return "#f39c12";
        default:       return "#95a5a6"; // gray — нет топлива ИЛИ данных о станции ещё нет
    }
}