// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

const APP_SESSION_KEY = "crossmedia-app-session";

if (!sessionStorage.getItem(APP_SESSION_KEY)) {
  localStorage.removeItem("token");
  sessionStorage.setItem(APP_SESSION_KEY, "active");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);