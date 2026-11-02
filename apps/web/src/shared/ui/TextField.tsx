import { forwardRef, useId, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  /** id of an extra description element (e.g. the password checklist) */
  describedBy?: string | undefined;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, describedBy, id, className, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const described =
    [error ? errorId : null, describedBy ?? null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        className={[
          'block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm outline-none transition',
          'focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1',
          'dark:bg-slate-900',
          error ? 'border-red-500' : 'border-slate-300 dark:border-slate-700',
          className ?? '',
        ].join(' ')}
        {...rest}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
});
