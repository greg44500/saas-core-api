import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  PLATFORM_PLAN_STATUS,
  formatPlatformPlanFeature,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';

const PRICE_PATTERN = /^\d+(?:[.,]\d{1,2})?$/;
const PLAN_KEY_PATTERN = /^[a-z][a-z0-9_-]*$/;

function minorToMajor(value) {
  if (!Number.isInteger(value)) return '0';
  return String(value / 100);
}

function getInitialLimitState(plan, metrics) {
  return Object.fromEntries(
    metrics.map(({ key }) => {
      const value = plan?.limits?.[key];

      if (value === null) {
        return [key, { mode: 'unlimited', value: '' }];
      }

      if (Number.isInteger(value) && value > 0) {
        return [
          key,
          {
            mode: 'limited',
            value: key === 'storage_bytes'
              ? String(value / (1024 * 1024))
              : String(value),
          },
        ];
      }

      return [key, { mode: 'none', value: '' }];
    }),
  );
}

function PlatformPlanForm({
  capabilities,
  mode,
  onCancel,
  onSubmit,
  pending = false,
  plan = null,
  submitError = null,
}) {
  const metrics = capabilities?.metrics ?? [];
  const availableFeatures = capabilities?.features ?? [];
  const [formError, setFormError] = useState(null);
  const [key, setKey] = useState(plan?.key ?? '');
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  const [status, setStatus] = useState(plan?.status ?? PLATFORM_PLAN_STATUS.ACTIVE);
  const [isPublic, setIsPublic] = useState(Boolean(plan?.isPublic));
  const [displayOrder, setDisplayOrder] = useState(String(plan?.displayOrder ?? 0));
  const [trialEnabled, setTrialEnabled] = useState(Boolean(plan?.trialEnabled));
  const [trialDurationDays, setTrialDurationDays] = useState(
    plan?.trialDurationDays == null ? '' : String(plan.trialDurationDays),
  );
  const [currency, setCurrency] = useState(plan?.currency ?? 'EUR');
  const [monthlyPrice, setMonthlyPrice] = useState(
    minorToMajor(plan?.priceMonthlyExclTaxMinor),
  );
  const [yearlyPrice, setYearlyPrice] = useState(
    minorToMajor(plan?.priceYearlyExclTaxMinor),
  );
  const [features, setFeatures] = useState(() => new Set(plan?.features ?? []));
  const [limits, setLimits] = useState(() => getInitialLimitState(plan, metrics));

  function toggleFeature(feature) {
    setFeatures((current) => {
      const next = new Set(current);
      if (next.has(feature)) next.delete(feature);
      else next.add(feature);
      return next;
    });
  }

  function updateLimit(metricKey, patch) {
    setLimits((current) => ({
      ...current,
      [metricKey]: {
        ...current[metricKey],
        ...patch,
      },
    }));
  }

  function parsePrice(value, label) {
    const normalized = value.replace(',', '.').trim();
    if (!PRICE_PATTERN.test(normalized)) {
      throw new Error(`${label} doit être un montant positif avec au plus 2 décimales.`);
    }
    return Math.round(Number(normalized) * 100);
  }

  function buildLimits() {
    return Object.fromEntries(
      metrics.map(({ key: metricKey }) => {
        const config = limits[metricKey] ?? { mode: 'none', value: '' };

        if (config.mode === 'unlimited') return [metricKey, null];
        if (config.mode === 'none') return [metricKey, 0];

        const normalized = config.value.replace(',', '.').trim();
        if (!normalized || Number(normalized) <= 0) {
          throw new Error(`Renseignez un plafond positif pour ${formatPlatformPlanMetric(metricKey)}.`);
        }

        if (metricKey === 'storage_bytes') {
          const megabytes = Number(normalized);
          if (!Number.isFinite(megabytes)) {
            throw new Error('Le plafond de stockage est invalide.');
          }
          return [metricKey, Math.round(megabytes * 1024 * 1024)];
        }

        const value = Number(normalized);
        if (!Number.isInteger(value)) {
          throw new Error(`Le plafond de ${formatPlatformPlanMetric(metricKey)} doit être un entier.`);
        }
        return [metricKey, value];
      }),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    try {
      const normalizedKey = key.trim();
      const normalizedName = name.trim();
      const normalizedCurrency = currency.trim().toUpperCase();
      const order = Number(displayOrder);

      if (mode === 'create' && !PLAN_KEY_PATTERN.test(normalizedKey)) {
        throw new Error('La clé doit commencer par une lettre minuscule et ne contenir que lettres, chiffres, _ ou -.');
      }
      if (normalizedName.length < 2 || normalizedName.length > 120) {
        throw new Error('Le nom doit contenir entre 2 et 120 caractères.');
      }
      if (!Number.isInteger(order) || order < 0) {
        throw new Error('L’ordre d’affichage doit être un entier positif ou nul.');
      }
      if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
        throw new Error('La devise doit être un code alphabétique de 3 lettres.');
      }

      let duration = null;
      if (trialEnabled) {
        duration = Number(trialDurationDays);
        if (!Number.isInteger(duration) || duration <= 0) {
          throw new Error('La durée du trial doit être un nombre entier de jours strictement positif.');
        }
      }

      const payload = {
        name: normalizedName,
        description: description.trim() || null,
        status,
        isPublic,
        displayOrder: order,
        trialEnabled,
        trialDurationDays: duration,
        currency: normalizedCurrency,
        priceMonthlyExclTaxMinor: parsePrice(monthlyPrice, 'Le prix mensuel'),
        priceYearlyExclTaxMinor: parsePrice(yearlyPrice, 'Le prix annuel'),
        features: [...features],
        limits: buildLimits(),
      };

      if (mode === 'create') payload.key = normalizedKey;

      await onSubmit(payload);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Le formulaire est invalide.');
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <section className="space-y-4">
        <h3 className="font-semibold">Offre commerciale</h3>

        {mode === 'create' && (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="platform-plan-key">Clé technique</label>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              id="platform-plan-key"
              onChange={(event) => setKey(event.target.value)}
              placeholder="premium"
              value={key}
            />
            <p className="text-xs text-muted-foreground">Immuable après création.</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="platform-plan-name">Nom</label>
          <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="platform-plan-name" maxLength={120} onChange={(event) => setName(event.target.value)} value={name} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="platform-plan-description">Description</label>
          <textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" id="platform-plan-description" maxLength={1000} onChange={(event) => setDescription(event.target.value)} value={description} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="platform-plan-status">Statut</label>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="platform-plan-status" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="active">Actif</option>
              <option value="inactive">Inactif</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="platform-plan-order">Ordre d’affichage</label>
            <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="platform-plan-order" min="0" onChange={(event) => setDisplayOrder(event.target.value)} type="number" value={displayOrder} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} type="checkbox" />
          Visible dans le catalogue public
        </label>
      </section>

      <section className="space-y-4">
        <h3 className="font-semibold">Tarification et trial</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="platform-plan-currency">Devise</label>
            <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm uppercase" id="platform-plan-currency" maxLength={3} onChange={(event) => setCurrency(event.target.value)} value={currency} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="platform-plan-monthly-price">Prix mensuel HT</label>
            <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="platform-plan-monthly-price" inputMode="decimal" onChange={(event) => setMonthlyPrice(event.target.value)} value={monthlyPrice} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="platform-plan-yearly-price">Prix annuel HT</label>
            <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="platform-plan-yearly-price" inputMode="decimal" onChange={(event) => setYearlyPrice(event.target.value)} value={yearlyPrice} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input checked={trialEnabled} onChange={(event) => setTrialEnabled(event.target.checked)} type="checkbox" />
          Trial disponible
        </label>

        {trialEnabled && (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="platform-plan-trial-duration">Durée du trial en jours</label>
            <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id="platform-plan-trial-duration" min="1" onChange={(event) => setTrialDurationDays(event.target.value)} type="number" value={trialDurationDays} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Fonctionnalités</h3>
        {availableFeatures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune fonctionnalité déclarée.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {availableFeatures.map((feature) => (
              <label className="flex items-center gap-2 rounded-md border border-border p-3 text-sm" key={feature}>
                <input checked={features.has(feature)} onChange={() => toggleFeature(feature)} type="checkbox" />
                {formatPlatformPlanFeature(feature)}
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-semibold">Limites</h3>
          <p className="text-sm text-muted-foreground">Chaque métrique doit être configurée explicitement.</p>
        </div>
        <div className="space-y-3">
          {metrics.map(({ key: metricKey }) => {
            const config = limits[metricKey] ?? { mode: 'none', value: '' };
            return (
              <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_170px_170px] sm:items-end" key={metricKey}>
                <div className="text-sm font-medium">{formatPlatformPlanMetric(metricKey)}</div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor={`platform-plan-limit-mode-${metricKey}`}>Mode</label>
                  <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id={`platform-plan-limit-mode-${metricKey}`} onChange={(event) => updateLimit(metricKey, { mode: event.target.value })} value={config.mode}>
                    <option value="none">Aucune</option>
                    <option value="limited">Plafond</option>
                    <option value="unlimited">Illimité</option>
                  </select>
                </div>
                {config.mode === 'limited' && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor={`platform-plan-limit-value-${metricKey}`}>
                      {metricKey === 'storage_bytes' ? 'Valeur (Mo)' : 'Valeur'}
                    </label>
                    <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" id={`platform-plan-limit-value-${metricKey}`} min="0" onChange={(event) => updateLimit(metricKey, { value: event.target.value })} type="number" value={config.value} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {(formError || submitError) && (
        <p className="text-sm text-destructive" role="alert">{formError ?? submitError}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button disabled={pending} onClick={onCancel} type="button" variant="outline">Annuler</Button>
        <Button disabled={pending} type="submit">
          {pending ? 'Enregistrement…' : mode === 'create' ? 'Créer le plan' : 'Enregistrer'}
        </Button>
      </div>
    </form>
  );
}

export { PlatformPlanForm };
