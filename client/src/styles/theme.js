// client/src/styles/theme.js
//
// SINGLE SOURCE OF TRUTH for buttons, cards, prices, and spacing.
// Import this in every page/component instead of hand-writing inline
// styles — this is what fixes "different button styles across pages"
// and "inconsistent product cards" structurally, not page-by-page.

export const colors = {
  primary: "#1B4332",
  primaryLight: "#40916C",
  primaryBg: "#F0FFF4",
  text: "#111827",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  border: "#E5E7EB",
  surface: "#F9FAFB",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  amber: "#F59E0B",
};

export const fonts = {
  heading: "'Syne', sans-serif",
  body: "'Nunito', sans-serif",
};

// ── BUTTONS ──────────────────────────────────────────────────
// Use these objects directly as the `style` prop. Three variants
// cover every button in the app — primary action, secondary/outline,
// and danger. Sizes: 'sm' | 'md' | 'lg'.

const sizePadding = {
  sm: "8px 16px",
  md: "12px 24px",
  lg: "16px 32px",
};
const sizeFontSize = {
  sm: "13px",
  md: "14px",
  lg: "16px",
};

export function buttonStyle(
  variant = "primary",
  size = "md",
  disabled = false,
) {
  const base = {
    padding: sizePadding[size],
    fontSize: sizeFontSize[size],
    fontFamily: fonts.body,
    fontWeight: 700,
    borderRadius: "10px",
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
    transition: "all 0.15s ease",
    opacity: disabled ? 0.6 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  };

  if (variant === "primary") {
    return { ...base, backgroundColor: colors.primary, color: "white" };
  }
  if (variant === "secondary") {
    return {
      ...base,
      backgroundColor: "white",
      color: colors.primary,
      border: `1.5px solid ${colors.primary}`,
    };
  }
  if (variant === "ghost") {
    return {
      ...base,
      backgroundColor: "transparent",
      color: colors.textMuted,
      border: `1px solid ${colors.border}`,
    };
  }
  if (variant === "danger") {
    return { ...base, backgroundColor: colors.dangerBg, color: colors.danger };
  }
  return base;
}

// ── CARDS ────────────────────────────────────────────────────
// Every card in the app (product card, summary card, dashboard
// tile) should use this base, then add only what's unique to it.

export const cardStyle = {
  backgroundColor: "white",
  border: `1px solid ${colors.border}`,
  borderRadius: "16px",
  padding: "16px",
  transition: "box-shadow 0.2s, transform 0.2s",
};

export const cardHoverStyle = {
  boxShadow: "0 8px 24px rgba(27,67,50,0.10)",
  transform: "translateY(-3px)",
};

// ── PRICE DISPLAY ────────────────────────────────────────────
// Use everywhere a Naira price is shown — product cards, cart,
// checkout, order history. Fixes "price font looks somehow."

export function priceStyle(size = "md") {
  const sizes = { sm: "15px", md: "18px", lg: "24px" };
  return {
    fontFamily: fonts.heading,
    fontWeight: 800,
    fontSize: sizes[size],
    color: colors.primary,
    letterSpacing: "-0.01em",
  };
}

export function formatNaira(amount) {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}

// ── BADGE / PILL ─────────────────────────────────────────────
export function badgeStyle(tone = "neutral") {
  const tones = {
    neutral: { bg: colors.border, fg: colors.textMuted },
    success: { bg: "#D1FAE5", fg: "#065F46" },
    warning: { bg: "#FEF3C7", fg: "#92400E" },
    danger: { bg: colors.dangerBg, fg: colors.danger },
  };
  const t = tones[tone] || tones.neutral;
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "50px",
    fontSize: "11px",
    fontWeight: 700,
    backgroundColor: t.bg,
    color: t.fg,
  };
}
