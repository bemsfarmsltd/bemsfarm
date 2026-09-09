import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute, { STAFF_ROLES } from "./components/ProtectedRoute";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const PaymentRecoveryPage = lazy(() => import("./pages/PaymentRecoveryPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ReturnsPage = lazy(() => import("./pages/ReturnsPage"));
const ChefBemsPage = lazy(() => import("./pages/ChefBemsPage"));
const DynamicPricingPage = lazy(() => import("./pages/DynamicPricingPage"));
const FraudDetectionPage = lazy(() => import("./pages/FraudDetectionPage"));
const DemandForecastingPage = lazy(() => import("./pages/DemandForecastingPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const CommercePolicyPage = lazy(() => import("./pages/CommercePolicyPage"));

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;
// Internal/staff-only tooling — same auth system as the storefront, but a
// plain customer (role "user") must never be able to reach these.
const Staff = ({ children }) => <ProtectedRoute allowedRoles={STAFF_ROLES}>{children}</ProtectedRoute>;

const ROUTE_META = {
  "/": ["BemsFarms — Fresh Nigerian Farm Produce", "Shop fresh Nigerian farm produce, pantry staples and cooking essentials with secure checkout and delivery."],
  "/products": ["Shop Farm Produce | BemsFarms", "Browse fresh produce, grains, oils, legumes and Nigerian pantry essentials from BemsFarms."],
  "/about": ["About BemsFarms", "Learn about BemsFarms and our approach to farm produce, food shopping and practical meal support."],
  "/contact": ["Contact BemsFarms", "Contact BemsFarms customer support for help with products, orders, delivery or your account."],
  "/track-order": ["Track Your Order | BemsFarms", "Use your BemsFarms delivery code to check the latest progress of your order."],
  "/login": ["Sign In | BemsFarms", "Sign in to your BemsFarms account to manage orders, delivery details and preferences."],
  "/register": ["Create an Account | BemsFarms", "Create a BemsFarms account to order groceries, save delivery details and access Chef Bems."],
  "/cart": ["Your Basket | BemsFarms", "Review the farm produce and pantry essentials in your BemsFarms basket."],
};

function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const [title, summary] = ROUTE_META[pathname] || ["BemsFarms — Fresh Nigerian Farm Produce", "Fresh Nigerian farm produce, pantry staples and cooking essentials from BemsFarms."];
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", summary);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://www.bemsfarms.com${pathname}`;
  }, [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#faf8f2] px-6 text-center font-bold text-[#17352a]" role="status">Loading BemsFarms…</div>}>
        <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/launch" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms" element={<CommercePolicyPage />} />
        <Route path="/privacy" element={<CommercePolicyPage />} />
        <Route path="/shipping" element={<CommercePolicyPage />} />
        <Route path="/returns-policy" element={<CommercePolicyPage />} />

        <Route
          path="/returns"
          element={
            <P>
              <ReturnsPage />
            </P>
          }
        />

        {/* Protected */}
        <Route
          path="/home"
          element={
            <P>
              <HomePage />
            </P>
          }
        />
        <Route
          path="/checkout"
          element={
            <P>
              <CheckoutPage />
            </P>
          }
        />
        <Route
          path="/order-confirmed"
          element={
            <P>
              <OrderConfirmation />
            </P>
          }
        />
        <Route
          path="/payment-recovery"
          element={
            <P>
              <PaymentRecoveryPage />
            </P>
          }
        />
        <Route
          path="/orders"
          element={
            <P>
              <OrdersPage />
            </P>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <P>
              <OrderDetailPage />
            </P>
          }
        />
        <Route
          path="/profile"
          element={
            <P>
              <ProfilePage />
            </P>
          }
        />
        <Route
          path="/admin"
          element={
            <Staff>
              <AdminPage />
            </Staff>
          }
        />
        <Route
          path="/chef-chat"
          element={
            <P>
              <ChefBemsPage />
            </P>
          }
        />
        <Route
          path="/dynamic-pricing"
          element={
            <Staff>
              <DynamicPricingPage />
            </Staff>
          }
        />
        <Route
          path="/fraud-detection"
          element={
            <Staff>
              <FraudDetectionPage />
            </Staff>
          }
        />
        <Route
          path="/demand-forecasting"
          element={
            <Staff>
              <DemandForecastingPage />
            </Staff>
          }
        />

        {/* Retired pages → redirect to Chef Bems */}
        <Route
          path="/semantic-search"
          element={<Navigate to="/chef-chat" replace />}
        />
        <Route
          path="/recipe-helper"
          element={<Navigate to="/chef-chat" replace />}
        />
        <Route
          path="/recommendations"
          element={<Navigate to="/chef-chat" replace />}
        />
        <Route path="/deals" element={<Navigate to="/chef-chat" replace />} />

        {/* Catch-all — must stay last */}
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
