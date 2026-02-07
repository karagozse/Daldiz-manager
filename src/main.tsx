import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AppProvider } from "@/contexts/AppContext";

// Chrome extension / service worker noise: ignore known benign unhandledrejection
const CHROME_EXT_NOISE =
  "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received";
window.addEventListener("unhandledrejection", (event) => {
  const msg = typeof event.reason?.message === "string" ? event.reason.message : String(event.reason ?? "");
  if (msg.includes(CHROME_EXT_NOISE)) {
    event.preventDefault();
  }
});

// Unregister service workers only when explicitly disabled (e.g. dev/debug).
// Normally we keep /service-worker.js for push notifications.
const SHOULD_UNREGISTER_SW = import.meta.env.VITE_DISABLE_SERVICE_WORKERS === 'true';

if ('serviceWorker' in navigator) {
  if (SHOULD_UNREGISTER_SW) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .catch((err) => {
          console.error('Service worker register edilirken hata:', err);
        });
    });
  }
}

// App entry point - renders main application
createRoot(document.getElementById("root")!).render(
  <div className="app-root">
    <AppProvider>
      <App />
    </AppProvider>
  </div>
);
