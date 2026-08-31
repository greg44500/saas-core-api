import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';

import { FormField } from '@/components/forms/form-field';
import { PasswordField } from '@/components/forms/password-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLoginMutation } from '@/features/auth/api/auth-api';
import { loginSchema } from '@/features/auth/validation/auth-schemas';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values) => {
    try {
      await login(values).unwrap();
      const destination = location.state?.from;
      navigate(destination ? `${destination.pathname}${destination.search ?? ''}${destination.hash ?? ''}` : '/', {
        replace: true,
      });
    } catch {
      setError('root.credentials', {
        type: 'server',
        message: 'Email ou mot de passe incorrect.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
        <p className="text-sm text-muted-foreground">Accédez à votre espace SaaS Core.</p>
      </div>

      {location.state?.registrationSuccess && (
        <p className="rounded-md border border-success/30 bg-success/10 p-3 text-sm" role="status">
          Compte créé. Vous pouvez maintenant vous connecter.
        </p>
      )}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? 'email-message' : undefined}
            {...register('email')}
          />
        </FormField>

        <FormField id="password" label="Mot de passe" error={errors.password?.message}>
          <PasswordField
            id="password"
            autoComplete="current-password"
            invalid={Boolean(errors.password)}
            describedBy={errors.password ? 'password-message' : undefined}
            {...register('password')}
          />
        </FormField>

        <div className="text-right">
          <span className="text-sm text-muted-foreground">Mot de passe oublié ?</span>
        </div>

        {errors.root?.credentials && (
          <p className="text-sm text-destructive" role="alert">{errors.root.credentials.message}</p>
        )}

        <Button className="w-full" type="submit" disabled={isLoading}>
          {isLoading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link className="font-medium text-primary hover:underline" to="/register">Créer un compte</Link>
      </p>
    </div>
  );
}

export { LoginPage };
