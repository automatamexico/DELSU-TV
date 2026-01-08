// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // si no tienes Tailwind vía CDN, deja tu CSS base aquí
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
