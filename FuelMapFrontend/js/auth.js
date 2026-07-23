const AUTH_TOKEN_KEY = "fuelmap_token";
const AUTH_USER_KEY = "fuelmap_user";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getAuthHeader() {
  const token = getToken();
  return token ? { Authorization: "Bearer " + token } : {};
}

function saveSession(token, user) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function getCurrentUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function register(email, password, name) {
  const response = await fetch(API + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Ошибка регистрации");
  }

  const data = await response.json();
  saveSession(data.token, { name: data.name, email: data.email });
  return data;
}

async function login(email, password) {
  const response = await fetch(API + "/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Ошибка входа");
  }

  const data = await response.json();
  saveSession(data.token, { name: data.name, email: data.email });
  return data;
}

async function fetchMe() {
  const token = getToken();
  if (!token) return null;

  const response = await fetch(API + "/auth/me", {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    return null;
  }

  const user = await response.json();

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));

  return user;
}

function loginWithGoogle() {
  window.location.href = API + "/auth/google/login";
}

(function handleGoogleRedirect() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.history.replaceState({}, document.title, window.location.pathname);
  }
})();
