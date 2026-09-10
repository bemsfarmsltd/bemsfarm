import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AIChatbot from "../AIChatbot";
import CartDrawer from "../ui/CartDrawer";

/*
  FIX: AIChatbot floating icon now hidden on /chef-chat.
  When the user is already on the Chef Bems page, showing the
  floating icon too is redundant and clutters the chat UI.
  It reappears automatically on every other page.
*/

// Routes where the floating chatbot icon should NOT appear
const HIDE_CHATBOT_ON = ["/chef-chat"];

export default function PageWrapper({ children, noFooter = false }) {
  const location = useLocation();
  const showChatbot = !HIDE_CHATBOT_ON.includes(location.pathname);

  return (
    <div
      style={{
        height: noFooter ? "100dvh" : undefined,
        minHeight: noFooter ? "100dvh" : "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: noFooter ? "hidden" : undefined,
      }}
    >
      <Navbar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        {children}
      </main>
      {!noFooter && <Footer />}
      {showChatbot && <AIChatbot />}
      <CartDrawer />
    </div>
  );
}
