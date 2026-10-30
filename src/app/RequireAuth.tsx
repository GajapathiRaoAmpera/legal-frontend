import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/auth/useSession";

export function RequireAuth() {
  const s = useSession();
  const loc = useLocation();
  if (!s)
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  return <Outlet />;
}
