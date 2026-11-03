import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './use-auth';
import { SessionLoading } from './SessionLoading';

/** Auth pages are for guests only; an authenticated user is sent to the app. */
export function GuestRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <SessionLoading />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
