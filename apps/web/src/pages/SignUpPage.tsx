import { Link, useNavigate } from 'react-router-dom';
import { SignUpForm } from '../features/auth/sign-up/SignUpForm';
import { useAuth } from '../features/auth/session/use-auth';
import { AuthCard } from '../shared/ui/AuthCard';

export function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  return (
    <AuthCard
      title="Create your account"
      subtitle={
        <>
          Already have one?{' '}
          <Link to="/sign-in" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm
        onSubmit={async (input) => {
          await signUp(input);
          void navigate('/', { replace: true });
        }}
      />
    </AuthCard>
  );
}
