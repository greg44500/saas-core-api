import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { FormField } from '@/components/forms/form-field';
import { ErrorState } from '@/components/shared/error-state';
import { FormSectionSkeleton } from '@/components/shared/form-section-skeleton';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useGetCurrentUserPreferencesQuery,
  useUpdateCurrentUserPreferencesMutation,
} from '@/features/preferences/api/user-preferences-api';
import {
  FONT_FAMILY_OPTIONS,
  PALETTE_OPTIONS,
  THEME_OPTIONS,
} from '@/features/preferences/constants/comfort-preference-options';
import {
  comfortPreferencesSchema,
} from '@/features/preferences/validation/comfort-preferences-schema';
import {
  APPEARANCE_ACCESSIBILITY_MODE,
  DEFAULT_COMFORT_PREFERENCES,
} from '@/lib/appearance-preferences';

function PreferencesPage() {
  const { toast } = useToast();
  const preferencesQuery = useGetCurrentUserPreferencesQuery();
  const [updatePreferences, { isLoading: isSaving }] =
    useUpdateCurrentUserPreferencesMutation();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(comfortPreferencesSchema),
    mode: 'onChange',
    defaultValues: { ...DEFAULT_COMFORT_PREFERENCES },
  });

  const comfortPreferences = preferencesQuery.data?.comfort;
  const isInitialLoading = preferencesQuery.data === undefined
    && (preferencesQuery.isLoading || preferencesQuery.isFetching);

  useEffect(() => {
    if (!comfortPreferences) return;
    reset(comfortPreferences);
  }, [comfortPreferences, reset]);

  async function onSubmit(values) {
    try {
      const updatedPreferences = await updatePreferences({
        comfort: values,
      }).unwrap();

      reset(updatedPreferences.comfort);
      toast({
        title: 'Préférences enregistrées',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Enregistrement impossible',
        description: error?.data?.message
          ?? 'Impossible d’enregistrer vos préférences.',
        variant: 'error',
      });
    }
  }

  if (isInitialLoading) {
    return (
      <FormSectionSkeleton
        fields={4}
        label="Chargement des préférences…"
      />
    );
  }

  if (preferencesQuery.isError || !comfortPreferences) {
    return (
      <ErrorState
        className="rounded-xl border border-destructive/30 bg-destructive/5"
        description="Vos préférences personnelles n’ont pas pu être récupérées."
        onRetry={() => preferencesQuery.refetch()}
        title="Impossible de charger les préférences"
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Préférences</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Personnalisez le confort d’affichage de votre compte. Ces choix vous
          suivent sur vos appareils lorsque vous êtes connecté.
        </p>
      </header>

      <form className="space-y-6" noValidate onSubmit={handleSubmit(onSubmit)}>
        <section className="space-y-5 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Apparence</h2>
            <p className="text-sm text-muted-foreground">
              Les options proposées sont contrôlées par le Design System du produit.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              error={errors.theme?.message}
              hint="Système suit automatiquement le thème clair ou sombre de votre appareil."
              id="theme"
              label="Thème"
            >
              <Select id="theme" {...register('theme')}>
                {THEME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              error={errors.fontFamily?.message}
              id="fontFamily"
              label="Police"
            >
              <Select id="fontFamily" {...register('fontFamily')}>
                {FONT_FAMILY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField
            error={errors.paletteId?.message}
            hint="Une seule palette est actuellement fournie par le Core. Les applications dérivées pourront en enregistrer d’autres explicitement."
            id="paletteId"
            label="Palette de couleurs"
          >
            <Select id="paletteId" {...register('paletteId')}>
              {PALETTE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
        </section>

        <section className="space-y-5 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Accessibilité renforcée</h2>
            <p className="text-sm text-muted-foreground">
              L’accessibilité structurelle reste toujours active. Ce profil ajoute
              des renforcements de confort sans remplacer les protections de base.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="accessibilityMode">
                Activer le profil renforcé
              </label>
              <p
                className="text-sm text-muted-foreground"
                id="accessibility-mode-description"
              >
                Renforce la visibilité du focus, le contraste de certains éléments
                secondaires et réduit les animations applicatives.
              </p>
            </div>

            <Controller
              control={control}
              name="accessibilityMode"
              render={({ field }) => (
                <Switch
                  aria-describedby="accessibility-mode-description"
                  aria-label="Activer le profil d’accessibilité renforcée"
                  checked={field.value === APPEARANCE_ACCESSIBILITY_MODE.ENHANCED}
                  disabled={isSaving}
                  id="accessibilityMode"
                  onCheckedChange={(checked) => field.onChange(
                    checked
                      ? APPEARANCE_ACCESSIBILITY_MODE.ENHANCED
                      : APPEARANCE_ACCESSIBILITY_MODE.STANDARD,
                  )}
                />
              )}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <Button disabled={!isDirty || isSaving} type="submit">
            {isSaving ? 'Enregistrement…' : 'Enregistrer les préférences'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export { PreferencesPage };
