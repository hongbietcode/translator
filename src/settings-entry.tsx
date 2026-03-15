import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./styles/components.css";
import { SettingsApp } from "./settings-app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SettingsApp />
  </StrictMode>,
);
