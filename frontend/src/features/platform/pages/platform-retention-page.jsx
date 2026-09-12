import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { SelectField } from '@/components/forms/select-field';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import { useToast } from '@/components/shared/toast-provider';
import { Button } from '@/components/ui/button';
import {
  useCreatePlatformRetentionPolicyVersionMutation,
  useExecutePlatformRetentionMutation,
  useGetPlatformRetentionExecutionsQuery,
  useGetPlatformRetentionStateQuery,
  useGetPlatformRetentionTargetsQuery,
  usePreviewPlatformRetentionMutation,
} from '@/features/platform/api/platform-retention-api';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import { PlatformRetentionSkeleton } from '@/features/platform/components/platform-loading-skeletons';
import { PlatformRetentionExecutionsTable } from '@/features/platform/components/platform-retention-executions-table';
import { PlatformRetentionPolicyForm } from '@/features/platform/components/platform-retention-policy-form';
import { PlatformRetentionPreview } from '@/features/platform/components/platform-retention-preview';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';
import {
  buildManualRetentionExecutionPayload,
  formatRetentionDate,
  getRetentionManualExecutionAvailability,
  hasPlatformPermission,
} from '@/features/platform/lib/platform-retention';

const PAGE_SIZE = 20;

function getErrorMessage(error, fallback) {
  return error?.data?.message
    ?? error?.data?.error?.message
    ?? fallback;
}

function Section({ children, help, title }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
        {help && (
          <InfoTooltip
            content={help}
            label={`Informations sur ${title}`}
          />
        )}
      </div>
      {children}
    </section>
  );
}

function PlatformRetentionPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTargetKey = searchParams.get('target');
  const parsedPage = Number(searchParams.get('page'));
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [preview, setPreview] = useState(null);

  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const {
    data: targets = [],
    isLoading: targetsLoading,
    refetch: refetchTargets,
  } = useGetPlatformRetentionTargetsQuery();

  const selectedTarget = useMemo(() => (
    targets.find(({ target }) => target.key === requestedTargetKey)
    ?? targets[0]
    ?? null
  ), [requestedTargetKey, targets]);
  const targetKey = selectedTarget?.target?.key ?? null;

  useEffect(() => {
    if (!targetKey || requestedTargetKey === targetKey) return;

    const next = new URLSearchParams(searchParams);
    next.set('target', targetKey);
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }, [requestedTargetKey, searchParams, setSearchParams, targetKey]);

  const {
    data: state,
    isFetching: stateFetching,
    refetch: refetchState,
  } = useGetPlatformRetentionStateQuery(targetKey, {
    skip: !targetKey,
  });
  const {
    data: executionData,
    isFetching: executionsFetching,
    refetch: refetchExecutions,
  } = useGetPlatformRetentionExecutionsQuery(
    { targetKey, page, limit: PAGE_SIZE },
    { skip: !targetKey },
  );

  const [previewRetention, { isLoading: previewPending }] =
    usePreviewPlatformRetentionMutation();
  const [createPolicyVersion, { isLoading: policyPending }] =
    useCreatePlatformRetentionPolicyVersionMutation();
  const [executeRetention, { isLoading: executionPending }] =
    useExecutePlatformRetentionMutation();

  const canPreview = hasPlatformPermission(
    platformAccess,
    PLATFORM_PERMISSION.RETENTION_PREVIEW,
  );
  const canUpdate = hasPlatformPermission(
    platformAccess,
    PLATFORM_PERMISSION.RETENTION_UPDATE,
  );
  const canExecute = hasPlatformPermission(
    platformAccess,
    PLATFORM_PERMISSION.RETENTION_EXECUTE,
  );

  useEffect(() => {
    if (
      preview
      && state?.currentPolicy?.version !== preview.policyVersion
    ) {
      setPreview(null);
    }
  }, [preview, state?.currentPolicy?.version]);

  function changeTarget(event) {
    const next = new URLSearchParams(searchParams);
    next.set('target', event.target.value);
    next.set('page', '1');
    setPreview(null);
    setSearchParams(next);
  }

  function changePage(nextPage) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  }

  async function handlePolicySubmit(body) {
    try {
      const policy = await createPolicyVersion({ targetKey, body }).unwrap();
      setPreview(null);
      toast({
        title: 'Politique enregistrée',
        description: `La version ${policy?.version ?? ''} est désormais la version courante.`.trim(),
      });
    } catch (error) {
      toast({
        title: 'Enregistrement impossible',
        description: getErrorMessage(
          error,
          'La règle n’a pas pu être enregistrée. Rechargez l’état avant de réessayer.',
        ),
        variant: 'destructive',
      });
    }
  }

  async function handlePreview() {
    try {
      const result = await previewRetention(targetKey).unwrap();
      setPreview(result);
    } catch (error) {
      setPreview(null);
      toast({
        title: 'Prévisualisation impossible',
        description: getErrorMessage(error, 'La prévisualisation de rétention a échoué.'),
        variant: 'destructive',
      });
    }
  }

  async function handleExecute(confirmation) {
    const body = buildManualRetentionExecutionPayload({
      preview,
      confirmation,
    });

    if (!body) return;

    try {
      const result = await executeRetention({ targetKey, body }).unwrap();
      setPreview(null);
      toast({
        title: 'Purge terminée',
        description: `${result?.execution?.counters?.affected ?? 0} élément(s) purgé(s).`,
      });
    } catch (error) {
      if (error?.status === 409) {
        setPreview(null);
      }
      toast({
        title: 'Purge non exécutée',
        description: getErrorMessage(
          error,
          'La purge a été refusée. Relancez une prévisualisation avant toute nouvelle tentative.',
        ),
        variant: 'destructive',
      });
      throw error;
    }
  }

  async function refreshAll() {
    await Promise.all([
      refetchTargets(),
      ...(targetKey ? [refetchState(), refetchExecutions()] : []),
    ]);
  }

  if (targetsLoading || (targetKey && stateFetching && state === undefined)) {
    return <PlatformRetentionSkeleton />;
  }

  if (!selectedTarget) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Rétention & purge</h1>
        <p className="text-sm text-muted-foreground">
          Aucune cible de rétention administrable n’est déclarée dans le registre Core.
        </p>
      </div>
    );
  }

  const target = state?.target ?? selectedTarget.target;
  const currentPolicy = state?.currentPolicy ?? selectedTarget.currentPolicy ?? null;
  const executionAvailability = getRetentionManualExecutionAvailability({
    canExecute,
    policy: currentPolicy,
    preview,
    runtime: state?.runtime,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Sécurité & données</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">Rétention & purge</h1>
            <InfoTooltip
              content="Définissez combien de temps les données sont conservées, prévisualisez les éléments concernés avant suppression et consultez l’historique durable des exécutions."
              label="Informations sur la rétention et la purge"
            />
          </div>
        </div>
        <Button disabled={stateFetching || executionsFetching} onClick={refreshAll} type="button" variant="outline">
          Actualiser
        </Button>
      </div>

      {targets.length > 1 && (
        <div className="max-w-md">
          <SelectField
            id="retention-target"
            label="Cible de rétention"
            onChange={changeTarget}
            options={targets.map(({ target: item }) => ({
              label: item.label,
              value: item.key,
            }))}
            value={targetKey}
          />
        </div>
      )}

      <Section
        help={target.description}
        title={`${target.label} — politique courante`}
      >
        {currentPolicy ? (
          <div className="mb-5 grid gap-3 text-sm sm:grid-cols-3">
            <p><span className="text-muted-foreground">Version :</span> v{currentPolicy.version}</p>
            <p><span className="text-muted-foreground">Créée le :</span> {formatRetentionDate(currentPolicy.createdAt)}</p>
            <p><span className="text-muted-foreground">État :</span> {currentPolicy.config.enabled ? 'Active' : 'Désactivée'}</p>
          </div>
        ) : (
          <p className="mb-5 text-sm text-muted-foreground">
            Aucune règle de conservation n’est encore définie pour cette catégorie de données.
          </p>
        )}

        {(currentPolicy || canUpdate) && (
          <PlatformRetentionPolicyForm
            currentPolicy={currentPolicy}
            disabled={!canUpdate}
            onSubmit={handlePolicySubmit}
            pending={policyPending}
            target={target}
          />
        )}
      </Section>

      <Section
        help={(
          <div className="space-y-2">
            <p>
              Pour lancer une purge manuelle, la politique doit être active,
              l’exécution manuelle autorisée, une prévisualisation réalisée et
              aucune autre purge en cours.
            </p>
            <p className="font-medium">État actuel : {executionAvailability.reason}</p>
          </div>
        )}
        title="Prévisualisation et purge"
      >
        <PlatformRetentionPreview
          canExecute={canExecute}
          canPreview={canPreview}
          executionPending={executionPending}
          onExecute={handleExecute}
          onPreview={handlePreview}
          policy={currentPolicy}
          preview={preview}
          previewPending={previewPending}
          runtime={state?.runtime}
        />
      </Section>

      <Section
        help="Cet historique technique des purges est conservé séparément des journaux d’audit susceptibles d’être supprimés."
        title="Historique des exécutions"
      >
        <PlatformRetentionExecutionsTable
          executions={executionData?.executions ?? []}
          loading={executionsFetching}
          onPageChange={changePage}
          page={page}
          pagination={executionData?.pagination}
        />
      </Section>
    </div>
  );
}

export { PlatformRetentionPage };
