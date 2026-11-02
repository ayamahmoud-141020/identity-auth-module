import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type SignInInput, signInSchema } from '@app/shared';
import { Button } from '../../../shared/ui/Button';
import { FormError } from '../../../shared/ui/FormError';
import { TextField } from '../../../shared/ui/TextField';
import { useServerErrors } from '../use-server-errors';

export function SignInForm({ onSubmit }: { onSubmit: (input: SignInInput) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema), mode: 'onTouched' });
  const { formError, clearFormError, handle } = useServerErrors(setError);

  const submit = handleSubmit(async (input) => {
    clearFormError();
    try {
      await onSubmit(input);
    } catch (error) {
      handle(error);
    }
  });

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
      <FormError message={formError} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <Button type="submit" pending={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
