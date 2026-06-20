// client/src/utils/categoryIcons.js
//
// Maps category names to emoji icons since the categories table
// has no icon/image column. Add new categories here as needed —
// falls back to a generic basket emoji for anything unmapped.

export const CATEGORY_ICONS = {
  "Grains & Cereals": "🌾",
  Vegetables: "🥬",
  "Cooking Oils": "🫒",
  Legumes: "🫘",
  "Tubers & Roots": "🍠",
  "Spices & Seasonings": "🌶️",
  "Leafy Greens": "🥦",
  Fruits: "🍎",
  Proteins: "🍗",
  "Dairy & Eggs": "🥚",
  Beverages: "🧃",
  Snacks: "🍿",
  Bakery: "🍞",
  "Frozen Foods": "🧊",
  "Condiments & Sauces": "🍯",
};

export function getCategoryIcon(name) {
  return CATEGORY_ICONS[name] || "🛒";
}
