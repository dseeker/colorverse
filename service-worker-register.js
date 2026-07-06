/**
 * Service Worker Registration for ColorVerse
 * Registers the service worker for offline support
 */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(registration => {
        console.log("[SW] Service Worker registered:", registration.scope);
      })
      .catch(error => {
        console.error("[SW] Service Worker registration failed:", error);
      });
  });
} else {
  console.log("[SW] Service Workers not supported in this browser");
}
