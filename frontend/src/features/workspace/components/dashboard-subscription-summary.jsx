import { Link } from 'react-router';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatAccessMode,
  formatSubscriptionStatus,
} from '@/features/subscription/lib/subscription-formatters';

function DashboardSubscriptionSummary({ workspaceId, subscription, isLoading, isError }) {
  const content = (
    <Card className="h-full shadow-sm transition-colors hover:border-primary/30">
      <CardContent>
        <p className="text-sm text-muted-foreground">Abonnement</p>
        {isLoading ? (
          <div aria-live="polite" className="mt-2" role="status">
            <span className="sr-only">Chargement de l’abonnement…</span>
            <Skeleton className="h-8 w-1/2" />
          </div>
        ) : isError || !subscription ? (
          <p className="mt-2 text-2xl font-semibold">Indisponible</p>
        ) : (
          <SubscriptionSummaryContent subscription={subscription} />
        )}
      </CardContent>
    </Card>
  );

  if (isLoading || isError || !subscription) return content;

  return (
    <Link
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      to={`/workspaces/${workspaceId}/subscription`}
    >
      {content}
    </Link>
  );
}

function SubscriptionSummaryContent({ subscription }) {
  const entitlement = subscription.effectiveEntitlement;
  const planName = entitlement?.plan?.name ?? 'Plan non renseigné';
  const status = formatSubscriptionStatus(entitlement?.subscriptionStatus);
  const accessMode = formatAccessMode(entitlement?.accessMode);

  return (
    <>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{planName}</p>
      <p className="mt-2 text-sm text-muted-foreground">{status} · {accessMode}</p>
    </>
  );
}

export { DashboardSubscriptionSummary };
