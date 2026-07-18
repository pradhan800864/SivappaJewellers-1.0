// Minimal CRA service worker registration helper

export function register() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", async () => {
        try {
          await navigator.serviceWorker.register("/service-worker.js");
        } catch (e) {
        }
      });
    }
  }

  export function unregister() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => reg.unregister())
        .catch(() => {});
    }
  }
