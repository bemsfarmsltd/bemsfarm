import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./styles/responsive.css";
import "./styles/theme.css";

if (typeof window !== "undefined") {
  // Automatically upgrade plain HTTP to HTTPS in production so ISP captive portals (e.g. gain-access.to) cannot intercept
  if (
    window.location.protocol === "http:" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    window.location.replace(
      `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`
    );
  }
}

if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  !window.location.pathname.startsWith("/admin")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js?v=2", { updateViaCache: "none" })
      .then((reg) => reg.update().catch(() => {}))
      .catch(() => {});
  });
}

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "353945421030-k8k917gf7rhi54d05jhb1s476e2tm7v3.apps.googleusercontent.com";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
