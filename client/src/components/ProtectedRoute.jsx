import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const STAFF_ROLES = ["superadmin", "admin", "manager", "accountant", "delivery_manager", "cashier", "storekeeper", "kitchen_staff"];

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isLoggedIn, user, adminUser, isAdminLoggedIn } = useAuth();
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
  }, [isStaffRoute, isStaffAuthenticated, isAuthorized, isLoggedIn, location.pathname, navigate]);

  if (!isAuthorized) return null;
  return children;
}

export { STAFF_ROLES };