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

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&q=80";

export function getProductImageByName(name) {
  return PRODUCT_IMAGES[name] || FALLBACK_IMAGE;
}

export function getProductImage(item) {
  if (
    item.image_url?.startsWith("data:") ||
    item.image_url?.startsWith("http")
  )
    return item.image_url;
  return getProductImageByName(item.name);
}
