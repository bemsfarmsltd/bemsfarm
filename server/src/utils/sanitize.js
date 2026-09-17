"use strict";

/**
 * Strips HTML tags and script injections from user-submitted text.
 * Prevents stored XSS attacks in product reviews, notes, and user comments.
 */
function sanitizeText(str, maxLength = 2000) {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, ""); // Strip all raw HTML tags
}

module.exports = {
  sanitizeText,
};
