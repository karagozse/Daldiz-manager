import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AppProvider } from "@/contexts/AppContext";

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
