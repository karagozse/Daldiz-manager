import { Navigate } from "react-router-dom";
import { useApp, UserRole } from "@/contexts/AppContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
}

/**
 * ProtectedRoute component that checks authentication and role-based access.
 * 
 * Note: This provides client-side route protection. For production use,
 * implement server-side session validation on the backend (for example using your own API and database).
 */
const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { activeRole } = useApp();
  
  // Check if user is logged in via localStorage
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const userRole = localStorage.getItem("userRole") as UserRole | null;
  
  // Redirect to login if not authenticated
  if (!isLoggedIn || !userRole) {
    return <Navigate to="/" replace />;
  }
  
  // Check role-based access if required roles are specified
  if (requiredRoles && requiredRoles.length > 0) {
    const effectiveRole = activeRole || userRole;
    if (!requiredRoles.includes(effectiveRole)) {
      // Redirect to dashboard if user doesn't have required role
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;
