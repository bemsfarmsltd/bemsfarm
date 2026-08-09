// Escapes HTML special characters so user-typed text can't be interpreted as
// markup when later run through a lightweight markdown-style transform
// (e.g. turning **bold** into <strong>) and rendered via dangerouslySetInnerHTML.
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}