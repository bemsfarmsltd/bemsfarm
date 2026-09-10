
export const PRODUCT_IMAGES = {
  "Ofada Rice":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141430/ofada_rice_mhhzt2.jpg",
  "Long Grain Rice":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141706/long_grain_rice_yn01lt.jpg",
  "Palm Oil":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141485/palm_oil_ufbfu6.jpg",
  "Groundnut Oil":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141769/Groundnut-oil_mgv43t.jpg",
  "Black-eyed Beans":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142333/black-eyed-beans_i2n8fi.jpg",
  "Brown Beans":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141864/brown_beans_zxbjos.jpg",
  "Garri (White)":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142399/white_garri_zaq8i4.png",
  "Garri (Yellow)":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142425/yellow_garri_kxiyxr.png",
  "Fresh Tomatoes":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141584/tomatoes_omiotj.jpg",
  "Dried Crayfish":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141631/crayfish_bslwl4.jpg",
  Cocoyam:
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780141939/cocoyam_wvtyqz.png",
  "Ugu Leaves":
    "https://res.cloudinary.com/dyzkjerez/image/upload/v1780142531/ugu_zva1av.png",
};

export const FALLBACK_IMAGE = "/bems_store_aisles.jpg";

export function getProductImageByName(name) {
  if (!name) return FALLBACK_IMAGE;
  if (PRODUCT_IMAGES[name]) return PRODUCT_IMAGES[name];

  const n = String(name).toLowerCase();
  if (n.includes("rice") || n.includes("jollof") || n.includes("basmati") || n.includes("parboiled") || n.includes("ofada") || n.includes("grain")) {
    return PRODUCT_IMAGES["Long Grain Rice"] || "/hero_food_1.jpg";
  }
  if (n.includes("oil") || n.includes("palm") || n.includes("groundnut") || n.includes("vegetable oil")) {
    return n.includes("groundnut") ? PRODUCT_IMAGES["Groundnut Oil"] : (PRODUCT_IMAGES["Palm Oil"] || "/hero_food_3.jpg");
  }
  if (n.includes("bean") || n.includes("oloyin") || n.includes("cowpea") || n.includes("lentil")) {
    return PRODUCT_IMAGES["Brown Beans"];
  }
  if (n.includes("yam") || n.includes("tuber") || n.includes("potato") || n.includes("cocoyam")) {
    return PRODUCT_IMAGES["Cocoyam"] || "/hero_food_4.jpg";
  }
  if (n.includes("garri") || n.includes("cassava") || n.includes("fufu") || n.includes("flour") || n.includes("semo")) {
    return n.includes("yellow") ? PRODUCT_IMAGES["Garri (Yellow)"] : PRODUCT_IMAGES["Garri (White)"];
  }
  if (n.includes("tomato") || n.includes("pepper") || n.includes("tatashe") || n.includes("rodo") || n.includes("habanero") || n.includes("onion")) {
    return PRODUCT_IMAGES["Fresh Tomatoes"];
  }
  if (n.includes("crayfish") || n.includes("fish") || n.includes("shrimp") || n.includes("seafood")) {
    return PRODUCT_IMAGES["Dried Crayfish"];
  }
  if (n.includes("leaf") || n.includes("leaves") || n.includes("vegetable") || n.includes("spinach") || n.includes("efo") || n.includes("ugu") || n.includes("bitterleaf")) {
    return PRODUCT_IMAGES["Ugu Leaves"];
  }
  return FALLBACK_IMAGE;
}

export function getProductImage(item) {
  if (!item) return FALLBACK_IMAGE;
  if (typeof item === "string") return getProductImageByName(item);
  if (
    item.image_url &&
    (item.image_url.startsWith("data:") ||
      item.image_url.startsWith("http") ||
      item.image_url.startsWith("/"))
  ) {
    return item.image_url;
  }
  return getProductImageByName(item.name || item.title);
}
