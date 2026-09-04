import { useMemo, useState } from 'react';

import { DataTable } from '@/components/data-display/data-table';
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
import { formatPlatformPlanFeature } from '@/features/platform/lib/platform-plan-formatters';

const QUICK_OVERRIDE_REASON = 'Ajustement commercial individuel via le réglage rapide Platform.';
const QUICK_REVOKE_REASON = 'Retour à la configuration du Plan depuis le réglage rapide Platform.';

function getApiMessage(error, fallback) {
  return error?.data?.message ?? fallback;
}

function PlatformWorkspaceFeatureOverrides({ capabilities, workspaceId }) {
  const { toast } = useToast();
  const [pendingFeatureKey, setPendingFeatureKey] = useState(null);
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
        <h2 className="text-lg font-semibold">Fonctionnalités du workspace</h2>
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

  const rows = (capabilities?.features ?? []).map((featureKey) => {
    const planEnabled = planFeatures.has(featureKey);
    const effectiveEnabled = effectiveFeatures.has(featureKey);
    const appliedOverride = activeOverridesByFeature.get(featureKey) ?? null;
    const definition = featureDefinitionsByKey.get(featureKey);

    return {
      featureKey,
      label: definition?.label ?? formatPlatformPlanFeature(featureKey),
      planEnabled,
      effectiveEnabled,
      appliedOverride,
    };
  });

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
          title: 'Configuration du plan restaurée',
          variant: 'success',
        });
        return;
      }

      if (row.appliedOverride) {
        await updateOverride({
          overrideId: row.appliedOverride.id,
          workspaceId,
          featureEnabled: desiredState,
        }).unwrap();
      } else {
        await createOverride({
          workspaceId,
          targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
          featureKey: row.featureKey,
          featureEnabled: desiredState,
          source: ENTITLEMENT_OVERRIDE_SOURCE.ADMINISTRATIVE,
          endsAt: null,
          reason: QUICK_OVERRIDE_REASON,
        }).unwrap();
      }

      toast({
        title: desiredState ? 'Fonctionnalité activée' : 'Fonctionnalité désactivée',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: getApiMessage(error, 'La personnalisation n’a pas pu être appliquée.'),
        variant: 'destructive',
      });
    } finally {
      setPendingFeatureKey(null);
    }
  }

  const columns = [
    {
      id: 'feature',
      header: 'Fonctionnalités',
      cell: (row) => {
        const planState = row.planEnabled ? 'incluse' : 'non incluse';
        const description = row.appliedOverride
          ? `Personnalisation du workspace — plan ${context.plan?.name ?? 'courant'} : ${planState}`
          : `Plan ${context.plan?.name ?? 'courant'} : ${planState}`;

        return (
          <FeatureToggle
            checked={row.effectiveEnabled}
            description={description}
            disabled={pendingFeatureKey !== null}
            label={row.label}
            onCheckedChange={(checked) => changeFeature(row, checked)}
          />
        );
      },
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="text-lg font-semibold">Offre personnalisée du workspace</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les interrupteurs représentent l’état effectif. Revenir à l’état du plan révoque la personnalisation correspondante.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">
          Aucune fonctionnalité n’est enregistrée dans le Capability Registry.
        </p>
      ) : (
        <DataTable columns={columns} data={rows} getRowKey={(row) => row.featureKey} />
      )}
    </section>
  );
}

export { PlatformWorkspaceFeatureOverrides };
