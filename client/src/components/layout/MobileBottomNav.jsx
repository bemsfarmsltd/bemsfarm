import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount, openCartDrawer } = useCart();
  const { isLoggedIn } = useAuth();

  const pathname = location.pathname;

  // Do not render bottom nav on checkout or order confirmation pages
  if (pathname === "/checkout" || pathname === "/order-confirmed") {
    return null;
  }

  const isHomeActive = pathname === "/" || pathname === "/home";
  const isShopActive = pathname.startsWith("/product");
  const isChefActive = pathname === "/chef-chat";
  const isOrdersActive = pathname === "/orders";

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-[#DFD6C2]/80 shadow-[0_-4px_20px_rgba(20,60,45,0.06)]"
      style={{
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="grid grid-cols-5 items-center justify-around h-15 px-2">
        {/* 1. Home */}
        <Link
          to={isLoggedIn ? "/home" : "/"}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            isHomeActive ? "text-[#143c2d] font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <div className="relative flex items-center justify-center h-6 w-6">
            <svg
              className={`h-5 w-5 transition-transform ${isHomeActive ? "scale-110" : ""}`}
              fill={isHomeActive ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={isHomeActive ? "2.2" : "1.8"}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            {isHomeActive && (
              <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#143c2d]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium">Home</span>
        </Link>

        {/* 2. Shop */}
        <Link
          to="/products"
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            isShopActive ? "text-[#143c2d] font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <div className="relative flex items-center justify-center h-6 w-6">
            <svg
              className={`h-5 w-5 transition-transform ${isShopActive ? "scale-110" : ""}`}
              fill={isShopActive ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={isShopActive ? "2.2" : "1.8"}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009 9.35c.613 0 1.2-.178 1.705-.487A3 3 0 0015 9.35a3 3 0 002.89-2.001M3.75 9.35l.93-4.186A2.25 2.25 0 016.877 3.5h10.246a2.25 2.25 0 012.197 1.664l.93 4.186"
              />
            </svg>
            {isShopActive && (
              <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#143c2d]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium">Shop</span>
        </Link>

        {/* 3. Chef Bems (AI Assistant) */}
        <Link
          to="/chef-chat"
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            isChefActive ? "text-[#143c2d] font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <div className="relative flex items-center justify-center h-6 w-6">
            <div className={`p-1 rounded-full ${isChefActive ? "bg-[#143c2d] text-amber-300" : "bg-emerald-50 text-[#143c2d]"}`}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            {isChefActive && (
              <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#143c2d]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium">Chef Bems</span>
        </Link>

        {/* 4. Orders */}
        <Link
          to={isLoggedIn ? "/orders" : "/login"}
          className={`flex flex-col items-center justify-center py-1 transition-all ${
            isOrdersActive ? "text-[#143c2d] font-bold" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <div className="relative flex items-center justify-center h-6 w-6">
            <svg
              className={`h-5 w-5 transition-transform ${isOrdersActive ? "scale-110" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={isOrdersActive ? "2.2" : "1.8"}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
              />
            </svg>
            {isOrdersActive && (
              <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#143c2d]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium">Orders</span>
        </Link>

        {/* 5. Basket (Triggers Cart Drawer) */}
        <button
          type="button"
          onClick={() => {
            if (pathname === "/cart") {
              navigate("/cart");
            } else {
              openCartDrawer();
            }
          }}
          className="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-800 transition-all cursor-pointer"
          aria-label={`Basket with ${cartCount} items`}
        >
          <div className="relative flex items-center justify-center h-6 w-6">
            <svg
              className="h-5 w-5 text-[#143c2d]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#e65100] text-[9px] font-black text-white shadow-xs animate-scale-in">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium text-[#143c2d]">Basket</span>
        </button>
      </div>
    </nav>
  );
}
