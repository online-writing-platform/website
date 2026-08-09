import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import type { UserRole } from "../types/auth";

interface RoleRouteProps {
  roles: UserRole[];
  children: ReactNode;
}

function RoleRoute({ roles, children }: RoleRouteProps) {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <div className="status-message">در حال بررسی دسترسی...</div>;
  }

  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default RoleRoute;
