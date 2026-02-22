import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { useThemeStore } from "@/stores/useThemeStore";
import "./assets/styles/main.css";

function ThemedToaster() {
  const theme = useThemeStore((s) => s.theme);
  return <Toaster position="top-center" richColors theme={theme} />;
}

ReactDOM.createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ThemedToaster />
    </BrowserRouter>
  </React.StrictMode>
);
