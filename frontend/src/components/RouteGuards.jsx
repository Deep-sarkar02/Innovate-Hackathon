import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoute() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  let role = null;
  try {
    role = JSON.parse(localStorage.getItem('user') ?? '{}')?.role;
  } catch { /* fall through */ }
  if (role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export function PublicRoute() {
  const token = localStorage.getItem('token');
  if (token) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
