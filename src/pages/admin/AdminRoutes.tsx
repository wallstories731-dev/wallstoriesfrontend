import { Navigate, Outlet } from "react-router";
import {
  AdminAuthProvider,
  useAdminAuth,
} from "../../context/AdminAuthContext";
import AdminWorkspace from "./AdminWorkspace";
export function AdminEntry() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}
export function AdminGuard() {
  const { authed, loading } = useAdminAuth();
  if (loading)
    return (
      <main className="admin-auth">
        <p role="status">Checking administrator access…</p>
      </main>
    );
  return authed ? <Outlet /> : <Navigate to="/admin" replace />;
}
export function AdminLive() {
  return <AdminWorkspace />;
}
export function AdminPreview() {
  return <AdminWorkspace preview />;
}
