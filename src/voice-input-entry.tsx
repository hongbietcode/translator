import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./styles/components.css";
import { VoiceInputApp } from "./voice-input-app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VoiceInputApp />
  </StrictMode>,
);
