import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { ErrorState } from '@/components/shared/error-state';
import { FormSectionSkeleton } from '@/components/shared/form-section-skeleton';
import { SelectField } from '@/components/shared/select-field';
import { useTheme } from '@/components/shared/theme-provider';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  useGetCurrentUserPreferencesQuery,
  useUpdateCurrentUserPreferencesMutation,
} from '@/features/preferences/api/user-preferences-api';
import { PalettePicker } from '@/features/preferences/components/palette-picker';
import {
  FONT_FAMILY_OPTIONS,
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
  const {
    applyComfortPreferences,
    comfortPreferences: appliedComfortPreferences,
  } = useTheme();
  const savedComfortPreferencesRef = useRef(null);
  const hasAppearancePreviewRef = useRef(false);
  const preferencesQuery = useGetCurrentUserPreferencesQuery();
  const [updatePreferences, { isLoading: isSaving }] =
    useUpdateCurrentUserPreferencesMutation();
  const {
    control,
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

    savedComfortPreferencesRef.current = comfortPreferences;
    reset(comfortPreferences);
  }, [comfortPreferences, reset]);

  useEffect(() => () => {
    if (!hasAppearancePreviewRef.current || !savedComfortPreferencesRef.current) {
      return;
    }

    /*
     * Une police ou une palette sélectionnée reste un aperçu tant que le
     * formulaire n'est pas enregistré. Quitter la page ne doit donc jamais
     * transformer cet aperçu en préférence implicite pour le reste de la session.
     */
    applyComfortPreferences(savedComfortPreferencesRef.current, {
      persistLocal: false,
    });
  }, [applyComfortPreferences]);

  function previewFontFamily(fontFamily, onFieldChange) {
    onFieldChange(fontFamily);
    hasAppearancePreviewRef.current = true;
    applyComfortPreferences({
      ...appliedComfortPreferences,
      fontFamily,
    }, { persistLocal: false });
  }

  function previewPalette(paletteId, onFieldChange) {
    onFieldChange(paletteId);
    hasAppearancePreviewRef.current = true;
    applyComfortPreferences({
      ...appliedComfortPreferences,
      paletteId,
    }, { persistLocal: false });
  }

  async function onSubmit(values) {
    try {
      const updatedPreferences = await updatePreferences({
        comfort: values,
      }).unwrap();

      savedComfortPreferencesRef.current = updatedPreferences.comfort;
      hasAppearancePreviewRef.current = false;
      applyComfortPreferences(updatedPreferences.comfort, { persistLocal: false });
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
            <Controller
              control={control}
              name="theme"
              render={({ field }) => (
                <SelectField
                  disabled={isSaving}
                  error={errors.theme?.message}
                  hint="Système suit automatiquement le thème clair ou sombre de votre appareil."
                  id="theme"
                  items={THEME_OPTIONS}
                  label="Thème"
                  name={field.name}
                  onBlur={field.onBlur}
                  onValueChange={field.onChange}
                  value={field.value}
                />
              )}
            />

            <Controller
              control={control}
              name="fontFamily"
              render={({ field }) => (
                <SelectField
                  disabled={isSaving}
                  error={errors.fontFamily?.message}
                  id="fontFamily"
                  items={FONT_FAMILY_OPTIONS}
                  label="Police"
                  name={field.name}
                  onBlur={field.onBlur}
                  onValueChange={(fontFamily) => previewFontFamily(
                    fontFamily,
                    field.onChange,
                  )}
                  value={field.value}
                />
              )}
            />
          </div>

          <Controller
            control={control}
            name="paletteId"
            render={({ field }) => (
              <PalettePicker
                disabled={isSaving}
                error={errors.paletteId?.message}
                onChange={(paletteId) => previewPalette(paletteId, field.onChange)}
                value={field.value}
              />
            )}
          />
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
