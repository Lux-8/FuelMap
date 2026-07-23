function getColor(status) {
  switch (status) {
    case "green":
      return "#2ecc71";
    case "orange":
      return "#f39c12";
    default:
      return "#95a5a6"; // gray — нет топлива ИЛИ данных о станции ещё нет
  }
}

// ненавязчивое уведомление — само появляется и исчезает, не требует клика
function showToast(message) {
  const existing = document.getElementById("appToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "appToast";
  toast.className = "app-toast";
  toast.textContent = message;

  document.body.appendChild(toast);

  // небольшая задержка перед показом — для плавной CSS-анимации появления
  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}
