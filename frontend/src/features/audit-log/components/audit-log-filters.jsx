import { useEffect, useState } from 'react';

import { DatePicker } from '@/components/forms/date-picker';
import { Button } from '@/components/ui/button';

const controlClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const EMPTY_FILTERS = Object.freeze({
  action: '',
  entityType: '',
  status: '',
  from: '',
  to: '',
});

function AuditLogFilters({
  filters,
  metadata,
  onApply,
  onReset,
  pending = false,
}) {
  const [draft, setDraft] = useState({ ...EMPTY_FILTERS, ...filters });
  const [dateError, setDateError] = useState('');
  const actions = metadata?.actions ?? [];
  const entityTypes = metadata?.entityTypes ?? [];
  const statuses = metadata?.statuses ?? [];

  useEffect(() => {
    setDraft({ ...EMPTY_FILTERS, ...filters });
  }, [filters]);

  function updateField(field, value) {
    setDateError('');
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (draft.from && draft.to && draft.from > draft.to) {
      setDateError('La date de début doit être antérieure ou égale à la date de fin.');
      return;
    }

    onApply(draft);
  }

  return (
    <form className="space-y-4 rounded-xl border border-border bg-card p-5" onSubmit={handleSubmit}>
      <div>
        <h2 className="text-base font-semibold">Filtrer l’activité</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Affinez l’historique avec les critères disponibles.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Action</span>
          <select
            className={controlClassName}
            disabled={pending}
            onChange={(event) => updateField('action', event.target.value)}
            value={draft.action}
          >
            <option value="">Toutes</option>
            {actions.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Ressource</span>
          <select
            className={controlClassName}
            disabled={pending}
            onChange={(event) => updateField('entityType', event.target.value)}
            value={draft.entityType}
          >
            <option value="">Toutes</option>
            {entityTypes.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Statut</span>
          <select
            className={controlClassName}
            disabled={pending}
            onChange={(event) => updateField('status', event.target.value)}
            value={draft.status}
          >
            <option value="">Tous</option>
            {statuses.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <div className="space-y-1.5 text-sm">
          <label className="font-medium" htmlFor="audit-from">Du</label>
          <DatePicker
            aria-label="Du"
            disabled={pending}
            id="audit-from"
            onChange={(value) => updateField('from', value)}
            value={draft.from}
          />
        </div>

        <div className="space-y-1.5 text-sm">
          <label className="font-medium" htmlFor="audit-to">Au</label>
          <DatePicker
            aria-label="Au"
            disabled={pending}
            id="audit-to"
            onChange={(value) => updateField('to', value)}
            value={draft.to}
          />
        </div>
      </div>

      {dateError && <p className="text-sm text-destructive" role="alert">{dateError}</p>}

      <div className="flex flex-wrap justify-end gap-2">
        <Button disabled={pending} onClick={onReset} type="button" variant="outline">
          Réinitialiser
        </Button>
        <Button disabled={pending} type="submit">
          Appliquer les filtres
        </Button>
      </div>
    </form>
  );
}

export { AuditLogFilters, EMPTY_FILTERS };
