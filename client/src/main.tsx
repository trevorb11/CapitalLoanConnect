import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// After a redeploy, lazy-loaded chunk filenames change; a browser that still has
// the previous index.html (or an open tab) requests old chunk URLs that no longer
// exist and the page crashes with a module-load error. Vite fires
// "vite:preloadError" in that case — reload once to pick up the new build.
// The sessionStorage guard prevents a reload loop if the server itself is down.
window.addEventListener("vite:preloadError", (event) => {
  const last = Number(sessionStorage.getItem("chunk-reload-at") || 0);
  if (Date.now() - last > 60_000) {
    sessionStorage.setItem("chunk-reload-at", String(Date.now()));
    event.preventDefault();
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
