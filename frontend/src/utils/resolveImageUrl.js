export function resolveImageUrl(u) {
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
  
    const base = process.env.REACT_APP_UPLOADS_BASE || "";
    if (!base) return u;
  
    return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
  }
  