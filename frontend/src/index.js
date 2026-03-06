// =============================================================================
// src/index.js — React Application Entry Point (Vercel Edition)
// =============================================================================
// Simplified — no BrowserRouter needed since the app is a single page
// that uses React state to switch between upload and card views.
// =============================================================================

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
