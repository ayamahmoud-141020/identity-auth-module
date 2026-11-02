import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SignInForm } from '../features/auth/sign-in/SignInForm';
import { useAuth } from '../features/auth/session/use-auth';
import { AuthCard } from '../shared/ui/AuthCard';

export function SignInPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  return (
    <AuthCard
      title="Welcome back"
      subtitle={
        <>
          New here?{' '}
          <Link to="/sign-up" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm
        onSubmit={async (input) => {
          await signIn(input);
          void navigate(from, { replace: true });
        }}
      />
    </AuthCard>
  );
}
