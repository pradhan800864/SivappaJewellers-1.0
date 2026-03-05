export function resolveImageUrl(u) {
  if (!u) return "";

  // Convert to string and cleanup accidental "undefined/" segments
  let s = String(u).replace(/(^|\/)undefined\/+/g, "/");

  const uploadsBase = (process.env.REACT_APP_UPLOADS_BASE || "").replace(/\/+$/, "");

  // If backend returned absolute url like http://host/uploads/x.jpg,
  // rewrite it to use uploadsBase path on same origin.
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      const url = new URL(s);
      if (url.pathname.startsWith("/uploads/") && uploadsBase) {
        const filename = url.pathname.replace(/^\/uploads\//, "");
        return `${url.origin}${uploadsBase}/${filename}`;
      }
      return s;
    }
  } catch (e) {
    // ignore URL parse failures
  }

  // If we already have /uploads/..., map to uploadsBase
  if (s.startsWith("/uploads/") && uploadsBase) {
    const filename = s.replace(/^\/uploads\//, "");
    return `${uploadsBase}/${filename}`;
  }

  // If it's already rooted path, return as-is
  if (s.startsWith("/")) return s;

  // Otherwise treat it as filename
  if (uploadsBase) return `${uploadsBase}/${s}`;

  return s;
}