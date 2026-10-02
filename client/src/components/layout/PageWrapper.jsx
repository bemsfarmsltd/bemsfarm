import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import AIChatbot from "../AIChatbot";
import CartDrawer from "../ui/CartDrawer";
import BroadcastPopup from "../ui/BroadcastPopup";
import CustomerSupportChat from "../ui/CustomerSupportChat";
import MobileBottomNav from "./MobileBottomNav";

/*
  FIX: AIChatbot floating icon now hidden on /chef-chat.
  When the user is already on the Chef Bems page, showing the
  floating icon too is redundant and clutters the chat UI.
  It reappears automatically on every other page.
*/

// Routes where floating widgets/chatbots should NOT appear (to prevent blocking checkout inputs & actions)
const HIDE_CHATBOT_ON = ["/chef-chat", "/checkout", "/order-confirmed", "/payment-recovery", "/cart"];
const HIDE_SUPPORT_CHAT_ON = ["/checkout", "/order-confirmed", "/cart", "/payment-recovery"];
const HIDE_BROADCAST_ON = ["/checkout", "/order-confirmed", "/cart", "/payment-recovery"];
const NO_BOTTOM_NAV_ON = ["/cart", "/checkout", "/order-confirmed"];

const matchesRoute = (currentPath, routes) =>
  routes.some((r) => currentPath === r || currentPath.startsWith(r + "/") || currentPath.startsWith(r + "?"));

export default function PageWrapper({ children, noFooter = false }) {
  const location = useLocation();
  const showChatbot = !matchesRoute(location.pathname, HIDE_CHATBOT_ON);
  const showSupportChat = !matchesRoute(location.pathname, HIDE_SUPPORT_CHAT_ON);
  const showBroadcast = !matchesRoute(location.pathname, HIDE_BROADCAST_ON);
  const showBottomNav = !matchesRoute(location.pathname, NO_BOTTOM_NAV_ON);

  return (
    <div
      style={{
        height: noFooter ? "100dvh" : undefined,
        minHeight: noFooter ? "100dvh" : "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: noFooter ? "hidden" : undefined,
      }}
      className={showBottomNav ? "pb-[68px] md:pb-0" : ""}
    >
      <Navbar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: noFooter ? "hidden" : undefined }}>
        {children}
      </main>
      {!noFooter && <Footer />}
      {showChatbot && <AIChatbot />}
      {showSupportChat && <CustomerSupportChat />}
      {showBroadcast && <BroadcastPopup />}
      <CartDrawer />
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}
