import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Global error handler to help diagnose issues in production
window.onerror = function(message, source, lineno, colno) {
  console.error("Global error:", message, "at", source, ":", lineno, ":", colno);
  const root = document.getElementById("root");
  if (root && root.innerHTML === "") {
    root.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; text-align: center;">
        <h1 style="color: #ef4444;">Erro de Aplicação</h1>
        <p>A aplicação não pôde ser carregada corretamente.</p>
        <p style="font-size: 14px; color: #64748b;">${message}</p>
        <button onclick="window.location.reload()" style="padding: 8px 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Tentar Novamente
        </button>
      </div>
    `;
  }
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
