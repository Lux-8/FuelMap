const PROFILE_KEY = "fuelmap_username";

const profileModal = document.getElementById("profileModal");
const closeProfileModal = document.querySelector(".close-profile");
const profileNameInput = document.getElementById("profileName");

function getUsername() {
    return localStorage.getItem(PROFILE_KEY) || "Аноним";
}

document.getElementById("profileBtn").onclick = () => {
    const current = getUsername();
    profileNameInput.value = current === "Аноним" ? "" : current;
    profileModal.style.display = "block";
};

closeProfileModal.onclick = () => {
    profileModal.style.display = "none";
};

window.addEventListener("click", (e) => {
    if (e.target === profileModal) {
        profileModal.style.display = "none";
    }
});

document.getElementById("saveProfile").onclick = () => {
    const name = profileNameInput.value.trim();

    if (name) {
        localStorage.setItem(PROFILE_KEY, name);
    } else {
        localStorage.removeItem(PROFILE_KEY);
    }

    profileModal.style.display = "none";
};