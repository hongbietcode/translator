import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./styles/components.css";
import { OnboardingApp } from "./onboarding-app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OnboardingApp />
  </StrictMode>,
);
