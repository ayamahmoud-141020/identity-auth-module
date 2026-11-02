import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignUpForm } from './SignUpForm';

describe('SignUpForm', () => {
  it('shows inline errors for each invalid field and does not submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SignUpForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Jo');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'abc');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getAllByRole('alert').map((el) => el.textContent)).toContain(
      'At least 8 characters',
    );
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('updates the live password checklist as the user types', async () => {
    const user = userEvent.setup();
    render(<SignUpForm onSubmit={vi.fn()} />);
    const items = () => screen.getAllByRole('listitem').map((li) => li.getAttribute('data-met'));

    expect(items()).toEqual(['false', 'false', 'false', 'false']);
    await user.type(screen.getByLabelText('Password'), 'abcdefg1');
    expect(items()).toEqual(['true', 'true', 'true', 'false']);
    await user.type(screen.getByLabelText('Password'), '!');
    expect(items()).toEqual(['true', 'true', 'true', 'true']);
  });

  it('submits normalized values and disables the button while pending', async () => {
    let resolve!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<SignUpForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), ' Jane ');
    await user.type(screen.getByLabelText('Email'), 'Jane@Example.COM');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!pass');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Jane',
      email: 'jane@example.com',
      password: 'Str0ng!pass',
    });
    resolve();
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
  });

  it('shows a server error banner for non-field API errors', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: { data: { statusCode: 409, message: 'An account with this email already exists' } },
    });
    const user = userEvent.setup();
    render(<SignUpForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Jane');
    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!pass');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists',
    );
  });
});
