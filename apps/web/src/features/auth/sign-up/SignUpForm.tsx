import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { type SignUpInput, signUpSchema } from '@app/shared';
import { Button } from '../../../shared/ui/Button';
import { FormError } from '../../../shared/ui/FormError';
import { TextField } from '../../../shared/ui/TextField';
import { useServerErrors } from '../use-server-errors';
import { PasswordChecklist } from './PasswordChecklist';

export function SignUpForm({ onSubmit }: { onSubmit: (input: SignUpInput) => Promise<void> }) {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema), mode: 'onTouched' });
  const { formError, clearFormError, handle } = useServerErrors(setError);
  const checklistId = useId();
  const password = useWatch({ control, name: 'password' }) ?? '';

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
        label="Name"
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="space-y-2">
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          describedBy={checklistId}
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordChecklist id={checklistId} password={password} />
      </div>
      <Button type="submit" pending={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
