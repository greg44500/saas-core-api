import { Link } from 'react-router';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardSummaryCard({
  label,
  value,
  description,
  href,
  isLoading = false,
  isError = false,
}) {
  const content = (
    <Card className="h-full shadow-sm transition-colors hover:border-primary/30">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        {isLoading ? (
          <div aria-live="polite" className="mt-2" role="status">
            <span className="sr-only">Chargement de {label.toLowerCase()}…</span>
            <Skeleton className="h-8 w-1/2" />
          </div>
        ) : (
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {isError ? 'Indisponible' : value}
          </p>
        )}
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (!href || isLoading || isError) return content;

  return (
    <Link
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      to={href}
    >
      {content}
    </Link>
  );
}

export { DashboardSummaryCard };
