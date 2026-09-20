import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const STAFF_ROLES = ["superadmin", "admin", "manager", "accountant", "delivery_manager", "cashier", "storekeeper", "kitchen_staff"];

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isLoggedIn, user, adminUser, isAdminLoggedIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isStaffRoute = Boolean(allowedRoles && !allowedRoles.includes("user"));

  // Effective staff user: adminUser preferred, fallback to user if user has staff role
  const activeStaff = adminUser || (user && STAFF_ROLES.includes(user.role) ? user : null);
  const isStaffAuthenticated = isAdminLoggedIn || Boolean(activeStaff);

  const isAuthorized = isStaffRoute
    ? (isStaffAuthenticated && (!allowedRoles || allowedRoles.includes(activeStaff?.role)))
    : (isLoggedIn && Boolean(user) && (!allowedRoles || allowedRoles.includes(user?.role)));

  useEffect(() => {
    if (loading) return;

    if (isStaffRoute) {
      if (!isStaffAuthenticated) {
        navigate("/admin/login", { state: { from: location.pathname }, replace: true });
      } else if (!isAuthorized) {
        navigate("/home", { replace: true });
      }
    } else {
      if (!isLoggedIn) {
        navigate("/login", { state: { from: location.pathname }, replace: true });
      } else if (!isAuthorized) {
        navigate("/home", { replace: true });
      }
    }
  }, [isStaffRoute, isStaffAuthenticated, isAuthorized, isLoggedIn, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF8F3]">
        <div className="w-8 h-8 border-3 border-emerald-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) return null;
  return children;
}

export { STAFF_ROLES };