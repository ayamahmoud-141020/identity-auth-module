import { useState } from 'react';
import { type FieldValues, type Path, type UseFormSetError } from 'react-hook-form';
import { toApiError } from '../../shared/api-client/http';

/** Maps the API error shape onto a form: field details → inline errors, everything else → banner. */
export function useServerErrors<T extends FieldValues>(setError: UseFormSetError<T>) {
  const [formError, setFormError] = useState<string | null>(null);

  const handle = (error: unknown): void => {
    const api = toApiError(error);
    if (!api) {
      setFormError('Something went wrong. Please try again.');
      return;
    }
    if (api.details) {
      for (const [field, messages] of Object.entries(api.details)) {
        setError(field as Path<T>, { type: 'server', message: messages[0] ?? 'Invalid value' });
      }
      return;
    }
    setFormError(api.message);
  };

  return { formError, clearFormError: () => setFormError(null), handle };
}
