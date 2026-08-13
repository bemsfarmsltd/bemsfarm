import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import ComingSoonPage from "./pages/ComingSoonPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OnboardingPage from "./pages/OnboardingPage";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetail from "./pages/ProductDetail";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import AdminPage from "./pages/AdminPage";
import ReturnsPage from "./pages/ReturnsPage";
import ChefBemsPage from "./pages/ChefBemsPage";
import DynamicPricingPage from "./pages/DynamicPricingPage";
import FraudDetectionPage from "./pages/FraudDetectionPage";
import DemandForecastingPage from "./pages/DemandForecastingPage";
import NotFoundPage from "./pages/NotFoundPage";

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<ComingSoonPage />} />
        <Route path="/launch" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

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
          path="/products"
          element={
            <P>
              <ProductsPage />
            </P>
          }
        />
        <Route
          path="/product/:id"
          element={
            <P>
              <ProductDetail />
            </P>
          }
        />
        <Route
          path="/cart"
          element={
            <P>
              <CartPage />
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
            <P>
              <AdminPage />
            </P>
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
            <P>
              <DynamicPricingPage />
            </P>
          }
        />
        <Route
          path="/fraud-detection"
          element={
            <P>
              <FraudDetectionPage />
            </P>
          }
        />
        <Route
          path="/demand-forecasting"
          element={
            <P>
              <DemandForecastingPage />
            </P>
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
    </BrowserRouter>
  );
}

export default App;
