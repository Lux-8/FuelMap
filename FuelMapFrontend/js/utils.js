function getColor(status) {
    switch (status) {
        case "green":  return "#2ecc71";
        case "orange": return "#f39c12";
        case "red":    return "#e74c3c";
        default:       return "#95a5a6"; // gray — статус неизвестен
    }
}