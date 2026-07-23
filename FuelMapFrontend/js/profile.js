console.log("profile.js загружен");

const profileModal = document.getElementById("profileModal");
const closeProfileModal = document.querySelector(".close-profile");

const authLoggedIn = document.getElementById("authLoggedIn");
const authForms = document.getElementById("authForms");
const profileUserInfo = document.getElementById("profileUserInfo");
const authError = document.getElementById("authError");

const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

function renderProfileState() {
  const user = getCurrentUser();

  if (user) {
    authLoggedIn.style.display = "block";
    authForms.style.display = "none";
    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("profileId").textContent = "#" + user.id;
    document.getElementById("profileBtn").textContent = "👤 " + user.name;
  } else {
    authLoggedIn.style.display = "none";
    authForms.style.display = "block";
    document.getElementById("profileBtn").textContent = "👤 Профиль";
  }
}

document.getElementById("profileBtn").onclick = async () => {
  authError.textContent = "";
  await fetchMe();
  renderProfileState();
  profileModal.style.display = "flex";
};

closeProfileModal.onclick = () => {
  profileModal.style.display = "none";
};

window.addEventListener("click", (e) => {
  if (e.target === profileModal) {
    profileModal.style.display = "none";
  }
});

tabLogin.onclick = () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.style.display = "block";
  registerForm.style.display = "none";
  authError.textContent = "";
};

tabRegister.onclick = () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.style.display = "block";
  loginForm.style.display = "none";
  authError.textContent = "";
};

const avatarInput = document.getElementById("avatarInput");
const avatarImg = document.getElementById("profileAvatarImg");

avatarInput.addEventListener("change", function () {
  const file = this.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    avatarImg.src = e.target.result;

    localStorage.setItem("fuelmap_avatar", e.target.result);
  };

  reader.readAsDataURL(file);
});

// загрузка сохраненной аватарки

const savedAvatar = localStorage.getItem("fuelmap_avatar");

if (savedAvatar) {
  avatarImg.src = savedAvatar;
}

document.getElementById("loginSubmit").onclick = async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const data = await login(email, password);
    renderProfileState();
    authError.textContent = "";

    // сразу показываем, что вход прошёл, и закрываем модалку через секунду
    authError.style.color = "#2ecc71";
    authError.textContent = "Готово! Вход выполнен как " + data.name;

    setTimeout(() => {
      profileModal.style.display = "none";
      authError.style.color = "";
      authError.textContent = "";
    }, 1200);
  } catch (err) {
    authError.style.color = "";
    authError.textContent = err.message;
  }
};

document.getElementById("registerSubmit").onclick = async () => {
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;

  try {
    const data = await register(email, password, name);
    renderProfileState();

    // регистрация автоматически логинит — явно показываем это пользователю
    authError.style.color = "#2ecc71";
    authError.textContent = "Аккаунт создан! Вы вошли как " + data.name;

    setTimeout(() => {
      profileModal.style.display = "none";
      authError.style.color = "";
      authError.textContent = "";
    }, 1500);
  } catch (err) {
    authError.style.color = "";
    authError.textContent = err.message;
  }
};

document.getElementById("googleLoginBtn").onclick = () => {
  loginWithGoogle();
};

document.getElementById("logoutBtn").onclick = () => {
  clearSession();
  renderProfileState();
  profileModal.style.display = "none";
};

(async () => {
  await fetchMe();
  renderProfileState();
})();
