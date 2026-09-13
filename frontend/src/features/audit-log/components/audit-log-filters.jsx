import { useEffect, useState } from 'react';

import { DatePicker } from '@/components/forms/date-picker';
import { SelectField } from '@/components/shared/select-field';
import { Button } from '@/components/ui/button';

const ALL_FILTER_VALUE = '__all__';

const EMPTY_FILTERS = Object.freeze({
  action: '',
  entityType: '',
  status: '',
  from: '',
  to: '',
});

function toFilterItems(items, allLabel) {
  return [
    { value: ALL_FILTER_VALUE, label: allLabel },
    ...items,
  ];
}

function fromSelectValue(value) {
  return value === ALL_FILTER_VALUE ? '' : value;
}

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
        <SelectField
          disabled={pending}
          id="audit-action"
          items={toFilterItems(actions, 'Toutes')}
          label="Action"
          onValueChange={(value) => updateField('action', fromSelectValue(value))}
          value={draft.action || ALL_FILTER_VALUE}
        />

        <SelectField
          disabled={pending}
          id="audit-entity-type"
          items={toFilterItems(entityTypes, 'Toutes')}
          label="Ressource"
          onValueChange={(value) => updateField('entityType', fromSelectValue(value))}
          value={draft.entityType || ALL_FILTER_VALUE}
        />

        <SelectField
          disabled={pending}
          id="audit-status"
          items={toFilterItems(statuses, 'Tous')}
          label="Statut"
          onValueChange={(value) => updateField('status', fromSelectValue(value))}
          value={draft.status || ALL_FILTER_VALUE}
        />

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

export { ALL_FILTER_VALUE, AuditLogFilters, EMPTY_FILTERS };
