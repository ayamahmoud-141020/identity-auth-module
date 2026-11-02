import { useState } from 'react';
import { useAuth } from '../features/auth/session/use-auth';
import { Button } from '../shared/ui/Button';

export function HomePage() {
  const { user, signOut } = useAuth();
  const [pending, setPending] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to the application.</h1>
        {user ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Signed in as{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">{user.name}</span> (
            {user.email})
          </p>
        ) : null}
        <Button
          variant="secondary"
          pending={pending}
          onClick={() => {
            setPending(true);
            void signOut().finally(() => setPending(false));
          }}
        >
          {pending ? 'Logging out…' : 'Logout'}
        </Button>
      </div>
    </main>
  );
}
