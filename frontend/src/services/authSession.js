const TOKEN_KEY = "token";
const STAY_LOGGED_IN_KEY = "crossmedia-stay-logged-in";

export function beginAppSession() {
  if (localStorage.getItem(STAY_LOGGED_IN_KEY) !== "true") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function persistAuthToken(token, stayLoggedIn) {
  if (stayLoggedIn) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(STAY_LOGGED_IN_KEY, "true");
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(STAY_LOGGED_IN_KEY);
  }
}

export function readAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(STAY_LOGGED_IN_KEY);
}
