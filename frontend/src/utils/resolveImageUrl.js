export function resolveImageUrl(path) {
  if (!path) return "";

  const uploadsBase = (process.env.REACT_APP_UPLOADS_BASE || "/uploads").replace(/\/+$/, "");
  const uploadsOrigin = (() => {
    try {
      return new URL(uploadsBase).origin;
    } catch {
      return "";
    }
  })();

  const raw = String(path).trim();

  // keep inline/browser-managed sources untouched
  if (
    raw.startsWith("data:") ||
    raw.startsWith("blob:") ||
    raw.startsWith("file:") ||
    raw.startsWith("capacitor:") ||
    raw.startsWith("/static/") ||
    raw.startsWith("static/")
  ) {
    return raw;
  }

  const isCapacitorApp =
    typeof window !== "undefined" &&
    !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  // absolute URL
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const u = new URL(raw);
      const isLocalHost =
        u.hostname === "localhost" ||
        u.hostname === "127.0.0.1" ||
        u.hostname === "10.0.2.2";

      // rewrite only in native app; keep web behavior unchanged
      if (isCapacitorApp && isLocalHost && uploadsOrigin) {
        const normalizedPath = u.pathname
          .replace(/^\/?admin-api\/?/i, "/")
          .replace(/^\/?uploads\/?/i, "/");
        return `${uploadsBase}${normalizedPath.startsWith("/") ? "" : "/"}${normalizedPath}`;
      }
    } catch {
      // if URL parsing fails, fall through to return raw
    }
    return raw;
  }

  let normalized = raw;

  // remove old admin-api prefix if present
  normalized = normalized.replace(/^\/?admin-api\/?/i, "");

  // remove leading uploads/ if present
  normalized = normalized.replace(/^\/?uploads\/?/i, "");

  // final normalized url
  return `${uploadsBase}/${normalized}`;
}
