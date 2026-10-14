/**
 * Service Worker Registration for ColorVerse
 * Registers the service worker for offline support and auto-updates.
 *
 * Update strategy: when a new SW takes control (controllerchange), reload
 * ONLY if the user is on the homepage (# or #/). If they're mid-coloring
 * (#item/, #category/), don't reload — they'll get the new code next session.
 */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(registration => {
        console.log("[SW] Service Worker registered:", registration.scope);

        // Listen for updates: when a new SW is installing, track it.
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) {
            return;
          }
          newWorker.addEventListener("statechange", () => {
            // newWorker.state: installing → installed → activating → activated
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // A new SW has been installed. skipWaiting() in the SW will
              // activate it immediately, triggering controllerchange below.
              console.log("[SW] New version installed, will activate shortly");
            }
          });
        });
      })
      .catch(error => {
        console.error("[SW] Service Worker registration failed:", error);
      });

    // When a new SW takes control, reload if user is on the homepage.
    // Don't reload mid-coloring — they'd lose their place.
    let hasReloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasReloaded) {
        return;
      } // Guard against double-fire
      hasReloaded = true;
      const hash = window.location.hash || "#";
      const isHomepage = hash === "#" || hash === "#/";
      if (isHomepage) {
        console.log("[SW] New controller active on homepage, reloading for fresh code");
        window.location.reload();
      } else {
        console.log(
          "[SW] New controller active, but user is mid-session — reload on next homepage visit"
        );
      }
    });
  });
} else {
  console.log("[SW] Service Workers not supported in this browser");
}
