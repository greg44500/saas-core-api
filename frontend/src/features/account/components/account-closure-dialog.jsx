import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { Input } from '@/components/ui/input';
import { useCloseCurrentAccountMutation } from '@/features/account/api/account-api';
import { AccountClosureImpact } from '@/features/account/components/account-closure-impact';
import { accountClosureFormSchema } from '@/features/account/validation/account-schemas';

function AccountClosureDialog({
  currentUserEmail = '',
  impact,
  onCancel,
  open,
}) {
  const navigate = useNavigate();
  const [closeCurrentAccount, { isLoading }] = useCloseCurrentAccountMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(accountClosureFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      currentPassword: '',
      confirmationEmail: '',
      confirmAccountClosure: false,
    },
  });

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const submitClosure = async (values) => {
    try {
      await closeCurrentAccount(values).unwrap();
      navigate('/login', { replace: true });
    } catch (error) {
      setError('root.server', {
        type: 'server',
        message: error?.data?.message ?? 'Impossible de fermer le compte pour le moment.',
      });
    }
  };

  const handleCancel = () => {
    if (isLoading) return;
    onCancel?.();
  };

  return (
    <ConfirmationDialog
      confirmLabel="Fermer définitivement mon compte"
      description="Vérifiez les conséquences puis confirmez votre identité et votre intention."
      errorMessage={errors.root?.server?.message}
      onCancel={handleCancel}
      onConfirm={handleSubmit(submitClosure)}
      open={open}
      pending={isLoading}
      pendingLabel="Fermeture…"
      title="Confirmer la fermeture du compte"
    >
      <AccountClosureImpact impact={impact} />

      <div className="mt-5 space-y-4">
        <FormField
          error={errors.confirmationEmail?.message}
          id="closureConfirmationEmail"
          label="Adresse email du compte"
        >
          <Input
            aria-describedby={errors.confirmationEmail ? 'closureConfirmationEmail-message' : undefined}
            aria-invalid={Boolean(errors.confirmationEmail)}
            autoComplete="email"
            id="closureConfirmationEmail"
            placeholder={currentUserEmail || 'vous@exemple.fr'}
            {...register('confirmationEmail')}
          />
        </FormField>

        <FormField
          error={errors.currentPassword?.message}
          id="closureCurrentPassword"
          label="Mot de passe actuel"
        >
          <PasswordField
            autoComplete="current-password"
            describedBy={errors.currentPassword ? 'closureCurrentPassword-message' : undefined}
            id="closureCurrentPassword"
            invalid={Boolean(errors.currentPassword)}
            {...register('currentPassword')}
          />
        </FormField>

        <div className="space-y-1">
          <label className="flex items-start gap-3 text-sm" htmlFor="confirmAccountClosure">
            <input
              className="mt-1 h-4 w-4 rounded border-border accent-destructive"
              id="confirmAccountClosure"
              type="checkbox"
              {...register('confirmAccountClosure')}
            />
            <span>
              Je comprends que cette fermeture met fin à mon accès et applique les conséquences listées ci-dessus.
            </span>
          </label>
          {errors.confirmAccountClosure && (
            <p className="text-sm text-destructive" role="alert">
              {errors.confirmAccountClosure.message}
            </p>
          )}
        </div>
      </div>
    </ConfirmationDialog>
  );
}

export { AccountClosureDialog };
