import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute, { STAFF_ROLES } from "./components/ProtectedRoute";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
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

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;
// Internal/staff-only tooling — same auth system as the storefront, but a
// plain customer (role "user") must never be able to reach these.
const Staff = ({ children }) => <ProtectedRoute allowedRoles={STAFF_ROLES}>{children}</ProtectedRoute>;

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#faf8f2] px-6 text-center font-bold text-[#17352a]" role="status">Loading BemsFarms…</div>}>
        <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/launch" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />

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
          path="/about"
          element={
            <P>
              <AboutPage />
            </P>
          }
        />
        <Route
          path="/contact"
          element={
            <P>
              <ContactPage />
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
