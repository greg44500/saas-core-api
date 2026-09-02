import { Link } from 'react-router';

import {
  formatAccessMode,
  formatSubscriptionStatus,
} from '@/features/subscription/lib/subscription-formatters';

function DashboardSubscriptionSummary({ workspaceId, subscription, isLoading, isError }) {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">Abonnement</p>
        <p className="mt-2 text-2xl font-semibold">Chargement…</p>
      </section>
    );
  }

  if (isError || !subscription) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">Abonnement</p>
        <p className="mt-2 text-2xl font-semibold">Indisponible</p>
      </section>
    );
  }

  const entitlement = subscription.effectiveEntitlement;
  const planName = entitlement?.plan?.name ?? 'Plan non renseigné';
  const status = formatSubscriptionStatus(entitlement?.subscriptionStatus);
  const accessMode = formatAccessMode(entitlement?.accessMode);

  return (
    <Link
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      to={`/workspaces/${workspaceId}/subscription`}
    >
      <section className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:border-primary/30">
        <p className="text-sm text-muted-foreground">Abonnement</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{planName}</p>
        <p className="mt-2 text-sm text-muted-foreground">{status} · {accessMode}</p>
      </section>
    </Link>
  );
}

export { DashboardSubscriptionSummary };
