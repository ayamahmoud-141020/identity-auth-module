import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';
import { GuestRoute } from './GuestRoute';
import { ProtectedRoute } from './ProtectedRoute';

function renderAt(path: string, status: AuthStatus) {
  const value: AuthContextValue = {
    status,
    user:
      status === 'authenticated' ? { id: '1', email: 'a@b.co', name: 'Jane', createdAt: '' } : null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  };
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>home page</p>} />
          </Route>
          <Route element={<GuestRoute />}>
            <Route path="/sign-in" element={<p>sign-in page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('route guards', () => {
  it('redirects anonymous users from a protected route to sign-in', () => {
    renderAt('/', 'anonymous');
    expect(screen.getByText('sign-in page')).toBeInTheDocument();
  });
  it('renders the protected route for authenticated users', () => {
    renderAt('/', 'authenticated');
    expect(screen.getByText('home page')).toBeInTheDocument();
  });
  it('redirects authenticated users away from guest routes', () => {
    renderAt('/sign-in', 'authenticated');
    expect(screen.getByText('home page')).toBeInTheDocument();
  });
  it('shows a loading state while the session is being restored', () => {
    renderAt('/', 'loading');
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
  });
});
