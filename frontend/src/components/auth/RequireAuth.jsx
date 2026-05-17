import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/auth/useAuth";

export default function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
