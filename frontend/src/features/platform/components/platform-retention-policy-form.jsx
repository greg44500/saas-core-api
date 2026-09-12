import { useEffect, useState } from 'react';

import { FormField } from '@/components/forms/form-field';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  buildRetentionPolicyPayload,
  createRetentionPolicyFormState,
} from '@/features/platform/lib/platform-retention';

function ToggleSetting({ checked, description, disabled, label, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <InfoTooltip content={description} label={`Informations sur ${label}`} />
      </div>
      <Switch
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

/**
 * Édite une nouvelle version de politique de rétention pour une cible Platform.
 *
 * Le composant possède uniquement l'état de formulaire. Les bornes autorisées,
 * les capacités de la cible et la version courante proviennent du backend ;
 * `buildRetentionPolicyPayload` transforme ensuite l'état UI en payload explicite.
 * Le backend reste l'autorité finale sur la validité de la politique et sur les
 * permissions d'administration.
 *
 * La resynchronisation locale est volontairement liée à `currentPolicy.version` :
 * un refetch qui ne change pas de version ne doit pas écraser une saisie en cours.
 * Cette règle explique le warning `react-hooks/exhaustive-deps` conservé et
 * analysé dans le lint frontend.
 *
 * @param {object} props
 * @param {object|null} props.currentPolicy Politique actuellement persistée.
 * @param {boolean} [props.disabled] Force un affichage en lecture seule.
 * @param {(payload: object) => Promise<void>} props.onSubmit Persiste la nouvelle version.
 * @param {boolean} [props.pending] Indique qu'une mutation est en cours.
 * @param {object} props.target Définition serveur de la cible et de ses bornes.
 */
function PlatformRetentionPolicyForm({
  currentPolicy,
  disabled = false,
  onSubmit,
  pending = false,
  target,
}) {
  const [form, setForm] = useState(() => createRetentionPolicyFormState(currentPolicy));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm(createRetentionPolicyFormState(currentPolicy));
    setErrors({});
  }, [currentPolicy?.version]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const result = buildRetentionPolicyPayload({
      form,
      target,
      currentPolicy,
    });

    if (!result.payload) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    await onSubmit(result.payload);
  }

  const bounds = target?.bounds;

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <ToggleSetting
        checked={form.enabled}
        description="Une politique désactivée reste historisée, mais aucune purge automatique ou manuelle ne peut l’utiliser."
        disabled={disabled || pending}
        label="Politique active"
        onChange={(checked) => updateField('enabled', checked)}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <FormField
          error={errors.retentionDays}
          hint={bounds ? `Entre ${bounds.retentionDays.min} et ${bounds.retentionDays.max} jours.` : undefined}
          id="retention-days"
          label="Durée de conservation (jours)"
        >
          <Input
            disabled={disabled || pending}
            id="retention-days"
            inputMode="numeric"
            max={bounds?.retentionDays?.max}
            min={bounds?.retentionDays?.min}
            onChange={(event) => updateField('retentionDays', event.target.value)}
            type="number"
            value={form.retentionDays}
          />
        </FormField>

        <FormField
          error={errors.batchSize}
          hint={bounds ? `Entre ${bounds.batchSize.min} et ${bounds.batchSize.max} éléments.` : undefined}
          id="retention-batch-size"
          label="Taille d’un lot"
        >
          <Input
            disabled={disabled || pending}
            id="retention-batch-size"
            inputMode="numeric"
            max={bounds?.batchSize?.max}
            min={bounds?.batchSize?.min}
            onChange={(event) => updateField('batchSize', event.target.value)}
            type="number"
            value={form.batchSize}
          />
        </FormField>

        <FormField
          error={errors.maxBatchesPerRun}
          hint={bounds ? `Entre ${bounds.maxBatchesPerRun.min} et ${bounds.maxBatchesPerRun.max} lots.` : undefined}
          id="retention-max-batches"
          label="Lots maximum par exécution"
        >
          <Input
            disabled={disabled || pending}
            id="retention-max-batches"
            inputMode="numeric"
            max={bounds?.maxBatchesPerRun?.max}
            min={bounds?.maxBatchesPerRun?.min}
            onChange={(event) => updateField('maxBatchesPerRun', event.target.value)}
            type="number"
            value={form.maxBatchesPerRun}
          />
        </FormField>
      </div>

      <ToggleSetting
        checked={form.scheduleEnabled}
        description="Le traitement technique externe respecte cette cadence sans utiliser l’identité d’un administrateur."
        disabled={disabled || pending}
        label="Exécution planifiée"
        onChange={(checked) => updateField('scheduleEnabled', checked)}
      />

      {form.scheduleEnabled && (
        <FormField
          error={errors.scheduleIntervalMinutes}
          hint={bounds ? `Entre ${bounds.scheduleIntervalMinutes.min} et ${bounds.scheduleIntervalMinutes.max} minutes.` : undefined}
          id="retention-schedule-interval"
          label="Intervalle de planification (minutes)"
        >
          <Input
            disabled={disabled || pending}
            id="retention-schedule-interval"
            inputMode="numeric"
            max={bounds?.scheduleIntervalMinutes?.max}
            min={bounds?.scheduleIntervalMinutes?.min}
            onChange={(event) => updateField('scheduleIntervalMinutes', event.target.value)}
            type="number"
            value={form.scheduleIntervalMinutes}
          />
        </FormField>
      )}

      <ToggleSetting
        checked={form.manualExecutionEnabled}
        description="Autorise les utilisateurs disposant du droit d’exécution à lancer une purge après prévisualisation et confirmation explicite."
        disabled={disabled || pending}
        label="Exécution manuelle autorisée"
        onChange={(checked) => updateField('manualExecutionEnabled', checked)}
      />

      {errors.form && (
        <p className="text-sm text-destructive" role="alert">{errors.form}</p>
      )}

      {!disabled && (
        <div className="flex justify-end">
          <Button disabled={pending} type="submit">
            {pending ? 'Enregistrement…' : 'Enregistrer une nouvelle version'}
          </Button>
        </div>
      )}
    </form>
  );
}

export { PlatformRetentionPolicyForm };
