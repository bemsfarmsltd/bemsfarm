import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

// Roles that exist on staff accounts (users.role) sharing this same auth
// system with the storefront — kept in sync with the admin app's
// lib/roles.js ROLES enum. "user" (the default customer role) is
// deliberately excluded from this list.
const STAFF_ROLES = ["superadmin", "admin", "manager", "accountant", "delivery_manager", "cashier", "storekeeper", "kitchen_staff"];

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const roleAllowed = !allowedRoles || (user && allowedRoles.includes(user.role));

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location.pathname } });
    } else if (!roleAllowed) {
      // Bounce silently rather than showing an "unauthorized" page —
      // no need to confirm to a customer that internal tooling exists here.
      navigate("/home", { replace: true });
    }
  }, [isLoggedIn, roleAllowed]);

  if (!isLoggedIn || !roleAllowed) return null;
  return children;
}

export { STAFF_ROLES };