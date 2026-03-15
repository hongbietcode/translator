import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./styles/components.css";
import { CaptionApp } from "./caption-app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CaptionApp />
  </StrictMode>,
);
