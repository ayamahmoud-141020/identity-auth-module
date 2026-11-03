import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './use-auth';
import { SessionLoading } from './SessionLoading';

/** Renders child routes only for authenticated users; anonymous users go to sign-in. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <SessionLoading />;
  if (status === 'anonymous')
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
