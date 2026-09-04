import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { Button } from '@/components/ui/button';
import {
  PLATFORM_PLAN_STATUS,
  formatPlatformPlanDate,
  formatPlatformPlanFeature,
  formatPlatformPlanLimit,
  formatPlatformPlanMetric,
  formatPlatformPlanPrice,
  formatPlatformPlanStatus,
} from '@/features/platform/lib/platform-plan-formatters';

function DetailRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value ?? '—'}</dd>
    </div>
  );
}

function PlatformPlanDetailsDrawer({
  onClose,
  onEdit,
  onArchive,
  open,
  plan,
}) {
  const archived = plan?.status === PLATFORM_PLAN_STATUS.ARCHIVED;
  const baseline = plan?.isBaseline === true;

  return (
    <EntityDetailsDrawer
      description="Définition commerciale, fonctionnalités, limites et règles de trial du plan."
      onClose={onClose}
      open={open}
      title={plan?.name ?? 'Détails du plan'}
    >
      {plan && (
        <div className="space-y-6">
          {baseline && (
            <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
              Ce plan est le plan de référence automatiquement associé aux nouveaux workspaces. Son contenu commercial peut évoluer, mais il doit rester actif et ne peut pas être archivé.
            </p>
          )}

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Offre</h3>
            <dl className="mt-2">
              <DetailRow label="Nom" value={plan.name} />
              <DetailRow label="Description" value={plan.description ?? '—'} />
              <DetailRow label="Rôle système" value={baseline ? 'Plan de référence' : 'Aucun'} />
              <DetailRow label="Statut" value={formatPlatformPlanStatus(plan.status)} />
              <DetailRow label="Catalogue public" value={plan.isPublic ? 'Oui' : 'Non'} />
              <DetailRow label="Ordre d’affichage" value={String(plan.displayOrder ?? 0)} />
              <DetailRow label="Prix mensuel HT" value={formatPlatformPlanPrice(plan.priceMonthlyExclTaxMinor, plan.currency)} />
              <DetailRow label="Prix annuel HT" value={formatPlatformPlanPrice(plan.priceYearlyExclTaxMinor, plan.currency)} />
              <DetailRow label="Trial" value={plan.trialEnabled ? 'Disponible' : 'Non disponible'} />
              <DetailRow label="Durée du trial" value={plan.trialEnabled ? `${plan.trialDurationDays} jour(s)` : '—'} />
              <DetailRow label="Créé le" value={formatPlatformPlanDate(plan.createdAt)} />
              <DetailRow label="Mis à jour le" value={formatPlatformPlanDate(plan.updatedAt)} />
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Fonctionnalités</h3>
            {plan.features?.length ? (
              <ul className="mt-2 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li className="rounded-md border border-border px-3 py-2" key={feature}>
                    {formatPlatformPlanFeature(feature)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Aucune fonctionnalité incluse.</p>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Limites</h3>
            <dl className="mt-2">
              {Object.entries(plan.limits ?? {}).map(([metric, value]) => (
                <DetailRow
                  key={metric}
                  label={formatPlatformPlanMetric(metric)}
                  value={formatPlatformPlanLimit(metric, value)}
                />
              ))}
            </dl>
          </section>

          <section className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div>
              <h3 className="font-semibold">Actions d’administration</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Les modifications restent validées et auditées par le backend.
              </p>
            </div>

            {archived ? (
              <p className="text-sm text-muted-foreground">
                Un plan archivé est conservé pour l’historique et ne peut plus être modifié.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => onEdit(plan)} type="button" variant="secondary">
                    Modifier
                  </Button>
                  {!baseline && (
                    <Button onClick={() => onArchive(plan)} type="button" variant="destructive">
                      Archiver
                    </Button>
                  )}
                </div>
                {baseline && (
                  <p className="text-xs text-muted-foreground">
                    Le plan de référence ne peut pas être archivé.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </EntityDetailsDrawer>
  );
}

export { PlatformPlanDetailsDrawer };
