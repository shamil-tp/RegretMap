/**
 * Only same-site relative paths are allowed as post-auth redirects, so a link
 * can't send users to another site (open-redirect protection).
 */
export function safeNextPath(value: unknown, fallback = "/account") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(value) || value.length > 300) return fallback;
  return value;
}
