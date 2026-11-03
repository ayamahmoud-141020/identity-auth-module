import { type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  pending?: boolean;
}

export function Button({
  variant = 'primary',
  pending = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const styles =
    variant === 'primary'
      ? 'bg-brand text-white hover:bg-brand-strong'
      : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
  return (
    <button
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={[
        'inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium shadow-sm transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        styles,
        className ?? '',
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
