export default function resolveImageUrl(path) {
  if (!path) return "";

  const uploadsBase = (process.env.REACT_APP_UPLOADS_BASE || "/uploads").replace(/\/+$/, "");

  // already absolute URL
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  // remove old admin-api prefix if present
  path = path.replace(/^\/?admin-api\/?/i, "");

  // remove leading uploads/ if present
  path = path.replace(/^\/?uploads\/?/i, "");

  // final normalized url
  return `${uploadsBase}/${path}`;
}