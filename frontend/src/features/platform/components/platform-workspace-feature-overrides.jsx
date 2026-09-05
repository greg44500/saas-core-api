import { Pencil, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTable, DataTableActions } from '@/components/data-display/data-table';
import { ActionIconButton } from '@/components/shared/action-icon-button';
import { ConfirmationDialog } from '@/components/shared/confirmation-dialog';
import { FeatureToggle } from '@/components/shared/feature-toggle';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useCreatePlatformEntitlementOverrideMutation,
  useGetPlatformEntitlementContextQuery,
  useRevokePlatformEntitlementOverrideMutation,
  useUpdatePlatformEntitlementOverrideMutation,
} from '@/features/platform/api/platform-entitlement-overrides-api';
import {
  ENTITLEMENT_OVERRIDE_SOURCE,
  ENTITLEMENT_OVERRIDE_TARGET,
} from '@/features/platform/lib/platform-entitlement-override-formatters';
import {
  formatPlatformPlanFeature,
  formatPlatformPlanLimit,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';
import { useEntitlementAutoRefresh } from '@/hooks/use-entitlement-auto-refresh';

const QUICK_OVERRIDE_REASON = 'Ajustement commercial individuel via le réglage rapide Platform.';
const QUICK_LIMIT_OVERRIDE_REASON = 'Ajustement individuel d’une limite via le réglage rapide Platform.';
const QUICK_REVOKE_REASON = 'Retour à la configuration du Plan depuis le réglage rapide Platform.';

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function getFeatureDescription(row, planName) {
  if (row.planEnabled) {
    if (!row.effectiveEnabled) {
      return `Incluse par défaut dans le plan ${planName} — désactivée par une dérogation exceptionnelle`;
    }

    return `Incluse par défaut dans le plan ${planName}`;
  }

  if (row.effectiveEnabled) {
    return 'Ajoutée par dérogation pour ce workspace';
  }

  return `Non incluse dans le plan ${planName}`;
}

function isByteMetric(metric) {
  return metric?.presentation?.unit === 'bytes'
    || metric?.unit === 'bytes'
    || metric?.key === 'storage_bytes';
}

function formatLimit(metricKey, value) {
  if (value === undefined) return '—';
  return formatPlatformPlanLimit(metricKey, value);
}

function toEditableLimit(metric, value) {
  if (value == null) return '';
  return isByteMetric(metric)
    ? String(value / (1024 * 1024))
    : String(value);
}

function PlatformWorkspaceFeatureOverrides({ capabilities, workspaceId }) {
  const { toast } = useToast();
  const [pendingFeatureKey, setPendingFeatureKey] = useState(null);
  const [pendingMetricKey, setPendingMetricKey] = useState(null);
  const [limitTarget, setLimitTarget] = useState(null);
  const [limitResetTarget, setLimitResetTarget] = useState(null);
  const [limitMode, setLimitMode] = useState('limited');
  const [limitValue, setLimitValue] = useState('');
  const [limitError, setLimitError] = useState(null);

  const contextQuery = useGetPlatformEntitlementContextQuery(workspaceId, {
    skip: !workspaceId,
  });
  const [createOverride] = useCreatePlatformEntitlementOverrideMutation();
  const [updateOverride] = useUpdatePlatformEntitlementOverrideMutation();
  const [revokeOverride] = useRevokePlatformEntitlementOverrideMutation();

  const featureDefinitionsByKey = useMemo(
    () => new Map(
      (capabilities?.featureDefinitions ?? []).map((definition) => [definition.key, definition]),
    ),
    [capabilities],
  );

  useEntitlementAutoRefresh({
    data: contextQuery.data,
    nextChangeAt: contextQuery.data?.nextEntitlementChangeAt,
    refetch: contextQuery.refetch,
    selectSnapshot: (data) => ({
      features: [...(data?.effective?.features ?? [])].sort(),
      limits: { ...(data?.effective?.limits ?? {}) },
    }),
    onChanged: ({ data, reason }) => {
      const planName = data?.plan?.name ?? 'courant';
      toast({
        title: 'Offre du workspace actualisée',
        description: reason === 'schedule'
          ? `Une dérogation a pris effet ou a expiré. Les droits effectifs du plan ${planName} ont été recalculés.`
          : `Les droits effectifs du plan ${planName} ont été resynchronisés.`,
        variant: 'info',
      });
    },
  });

  if (!workspaceId) return null;

  if (contextQuery.isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">Chargement de l’offre effective…</p>
      </section>
    );
  }

  if (contextQuery.error || !contextQuery.data) {
    return (
      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Droits et limites du workspace</h2>
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger l’offre effective de ce workspace.
        </p>
        <Button onClick={contextQuery.refetch} type="button" variant="outline">
          Réessayer
        </Button>
      </section>
    );
  }

  const context = contextQuery.data;
  const planFeatures = new Set(context.plan?.features ?? []);
  const effectiveFeatures = new Set(context.effective?.features ?? []);
  const activeOverridesByFeature = new Map(
    (context.appliedOverrides ?? [])
      .filter((override) => override.targetType === ENTITLEMENT_OVERRIDE_TARGET.FEATURE)
      .map((override) => [override.featureKey, override]),
  );
  const activeOverridesByMetric = new Map(
    (context.appliedOverrides ?? [])
      .filter((override) => override.targetType === ENTITLEMENT_OVERRIDE_TARGET.LIMIT)
      .map((override) => [override.metricKey, override]),
  );

  const featureRows = (capabilities?.features ?? []).map((featureKey) => {
    const planEnabled = planFeatures.has(featureKey);
    const effectiveEnabled = effectiveFeatures.has(featureKey);
    const appliedOverride = activeOverridesByFeature.get(featureKey) ?? null;
    const definition = featureDefinitionsByKey.get(featureKey);

    return {
      featureKey,
      label: definition?.label ?? formatPlatformPlanFeature(featureKey),
      helpText: definition?.description ?? null,
      planEnabled,
      effectiveEnabled,
      appliedOverride,
    };
  });

  const metricRows = (capabilities?.metrics ?? []).map((metric) => ({
    metric,
    metricKey: metric.key,
    label: metric.presentation?.label ?? formatPlatformPlanMetric(metric.key),
    planValue: context.plan?.limits?.[metric.key],
    effectiveValue: context.effective?.limits?.[metric.key],
    appliedOverride: activeOverridesByMetric.get(metric.key) ?? null,
  }));

  async function changeFeature(row, desiredState) {
    if (desiredState === row.effectiveEnabled) return;

    setPendingFeatureKey(row.featureKey);

    try {
      if (desiredState === row.planEnabled) {
        if (!row.appliedOverride) return;

        await revokeOverride({
          overrideId: row.appliedOverride.id,
          workspaceId,
          reason: QUICK_REVOKE_REASON,
        }).unwrap();

        toast({
          title: 'Retour à la configuration du plan',
          variant: 'success',
        });
        return;
      }

      await createOverride({
        workspaceId,
        targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
        featureKey: row.featureKey,
        featureEnabled: desiredState,
        source: ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
        endsAt: null,
        reason: QUICK_OVERRIDE_REASON,
      }).unwrap();

      toast({
        title: desiredState
          ? 'Fonctionnalité activée pour le workspace'
          : 'Fonctionnalité désactivée pour le workspace',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: getApiMessage(error, 'La personnalisation n’a pas pu être appliquée.'),
        variant: 'error',
      });
    } finally {
      setPendingFeatureKey(null);
    }
  }

  function openLimitEditor(row) {
    setLimitError(null);
    setLimitTarget(row);
    setLimitMode(row.effectiveValue === null ? 'unlimited' : 'limited');
    setLimitValue(toEditableLimit(row.metric, row.effectiveValue));
  }

  function closeLimitEditor() {
    if (pendingMetricKey) return;
    setLimitTarget(null);
    setLimitError(null);
  }

  function parseDesiredLimit() {
    if (!limitTarget) throw new Error('Aucune limite sélectionnée.');
    if (limitMode === 'unlimited') return null;

    const normalized = String(limitValue).replace(',', '.').trim();
    const numericValue = Number(normalized);

    if (!normalized || !Number.isFinite(numericValue) || numericValue < 0) {
      throw new Error('La limite doit être un nombre positif ou nul.');
    }

    if (isByteMetric(limitTarget.metric)) {
      return Math.round(numericValue * 1024 * 1024);
    }

    if (!Number.isInteger(numericValue)) {
      throw new Error('La limite doit être un entier.');
    }

    return numericValue;
  }

  async function applyLimit() {
    if (!limitTarget) return;

    setLimitError(null);
    setPendingMetricKey(limitTarget.metricKey);

    try {
      const desiredValue = parseDesiredLimit();

      if (desiredValue === limitTarget.planValue) {
        if (limitTarget.appliedOverride) {
          await revokeOverride({
            overrideId: limitTarget.appliedOverride.id,
            workspaceId,
            reason: QUICK_REVOKE_REASON,
          }).unwrap();
        }
      } else if (limitTarget.appliedOverride) {
        await updateOverride({
          overrideId: limitTarget.appliedOverride.id,
          workspaceId,
          limitValue: desiredValue,
          source: ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
          reason: QUICK_LIMIT_OVERRIDE_REASON,
        }).unwrap();
      } else {
        await createOverride({
          workspaceId,
          targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
          metricKey: limitTarget.metricKey,
          limitValue: desiredValue,
          source: ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
          endsAt: null,
          reason: QUICK_LIMIT_OVERRIDE_REASON,
        }).unwrap();
      }

      toast({
        title: desiredValue === limitTarget.planValue
          ? 'Limite revenue à la valeur du plan'
          : 'Limite personnalisée appliquée',
        variant: 'success',
      });
      setLimitTarget(null);
    } catch (error) {
      setLimitError(
        error instanceof Error
          ? error.message
          : getApiMessage(error, 'La limite n’a pas pu être modifiée.'),
      );
    } finally {
      setPendingMetricKey(null);
    }
  }

  async function confirmResetLimit() {
    if (!limitResetTarget?.appliedOverride) return;

    setPendingMetricKey(limitResetTarget.metricKey);
    try {
      await revokeOverride({
        overrideId: limitResetTarget.appliedOverride.id,
        workspaceId,
        reason: QUICK_REVOKE_REASON,
      }).unwrap();
      toast({ title: 'Retour à la limite du plan', variant: 'success' });
      setLimitResetTarget(null);
    } catch (error) {
      toast({
        title: getApiMessage(error, 'La dérogation de limite n’a pas pu être révoquée.'),
        variant: 'error',
      });
    } finally {
      setPendingMetricKey(null);
    }
  }

  const planName = context.plan?.name ?? 'courant';
  const featureColumns = [
    {
      id: 'feature',
      header: 'Fonctionnalités',
      cell: (row) => (
        <FeatureToggle
          checked={row.effectiveEnabled}
          description={getFeatureDescription(row, planName)}
          disabled={pendingFeatureKey !== null}
          helpText={row.helpText}
          label={row.label}
          onCheckedChange={(checked) => changeFeature(row, checked)}
        />
      ),
    },
  ];

  const limitColumns = [
    {
      id: 'metric',
      header: 'Limite',
      headerClassName: 'w-[30%]',
      cell: (row) => <span className="font-medium">{row.label}</span>,
    },
    {
      id: 'plan',
      header: `Plan ${planName}`,
      headerClassName: 'w-[18%]',
      cell: (row) => formatLimit(row.metricKey, row.planValue),
    },
    {
      id: 'override',
      header: 'Dérogation',
      headerClassName: 'w-[18%]',
      cell: (row) => row.appliedOverride
        ? formatLimit(row.metricKey, row.appliedOverride.limitValue)
        : '—',
    },
    {
      id: 'effective',
      header: 'Effectif',
      headerClassName: 'w-[18%]',
      cell: (row) => formatLimit(row.metricKey, row.effectiveValue),
    },
    {
      id: 'actions',
      header: 'Actions',
      headerClassName: 'w-[16%]',
      cell: (row) => (
        <DataTableActions className="items-center">
          <ActionIconButton
            Icon={Pencil}
            disabled={pendingMetricKey !== null}
            label={`Ajuster ${row.label}`}
            onClick={() => openLimitEditor(row)}
            variant="outline"
          />
          {row.appliedOverride && (
            <ActionIconButton
              Icon={RotateCcw}
              disabled={pendingMetricKey !== null}
              label={`Revenir au plan pour ${row.label}`}
              onClick={() => setLimitResetTarget(row)}
              variant="ghost"
            />
          )}
        </DataTableActions>
      ),
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="text-lg font-semibold">Droits et limites du workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le plan reste la base commerciale. Les dérogations modifient uniquement ce workspace et la colonne Effectif indique ce que le backend applique réellement.
        </p>
      </div>

      <div className="border-b border-border p-5 pb-3">
        <h3 className="font-semibold">Fonctionnalités</h3>
      </div>
      {featureRows.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">
          Aucune fonctionnalité n’est enregistrée dans le Capability Registry.
        </p>
      ) : (
        <DataTable
          columns={featureColumns}
          data={featureRows}
          getRowKey={(row) => row.featureKey}
        />
      )}

      <div className="border-y border-border p-5 pb-3">
        <h3 className="font-semibold">Limites et quotas</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajustez une limite sans modifier le plan catalogue partagé. Une valeur identique au plan retire naturellement la dérogation active.
        </p>
      </div>
      {metricRows.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">
          Aucune limite n’est enregistrée dans le Capability Registry.
        </p>
      ) : (
        <DataTable
          columns={limitColumns}
          data={metricRows}
          getRowKey={(row) => row.metricKey}
          tableClassName="table-fixed"
        />
      )}

      <ConfirmationDialog
        confirmLabel="Appliquer"
        confirmVariant="default"
        description={limitTarget
          ? `Plan : ${formatLimit(limitTarget.metricKey, limitTarget.planValue)} — Effectif actuel : ${formatLimit(limitTarget.metricKey, limitTarget.effectiveValue)}`
          : ''}
        errorMessage={limitError}
        onCancel={closeLimitEditor}
        onConfirm={applyLimit}
        open={Boolean(limitTarget)}
        pending={Boolean(pendingMetricKey)}
        pendingLabel="Application…"
        title={limitTarget ? `Ajuster ${limitTarget.label}` : 'Ajuster la limite'}
      >
        {limitTarget && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="quick-limit-mode">Mode</label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                id="quick-limit-mode"
                onChange={(event) => setLimitMode(event.target.value)}
                value={limitMode}
              >
                <option value="limited">Plafond défini</option>
                <option value="unlimited">Illimité</option>
              </select>
            </div>

            {limitMode === 'limited' && (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="quick-limit-value">
                  {isByteMetric(limitTarget.metric) ? 'Limite en Mo' : 'Limite'}
                </label>
                <input
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  id="quick-limit-value"
                  min="0"
                  onChange={(event) => setLimitValue(event.target.value)}
                  step={isByteMetric(limitTarget.metric) ? '0.01' : '1'}
                  type="number"
                  value={limitValue}
                />
              </div>
            )}
          </div>
        )}
      </ConfirmationDialog>

      <ConfirmationDialog
        confirmLabel="Revenir au plan"
        confirmVariant="default"
        description={limitResetTarget
          ? `La dérogation sera retirée et ${limitResetTarget.label} reviendra à ${formatLimit(limitResetTarget.metricKey, limitResetTarget.planValue)}.`
          : ''}
        onCancel={() => {
          if (!pendingMetricKey) setLimitResetTarget(null);
        }}
        onConfirm={confirmResetLimit}
        open={Boolean(limitResetTarget)}
        pending={Boolean(pendingMetricKey)}
        title="Retirer la dérogation de limite"
      />
    </section>
  );
}

export {
  PlatformWorkspaceFeatureOverrides,
  formatLimit,
  getFeatureDescription,
  isByteMetric,
  toEditableLimit,
};
