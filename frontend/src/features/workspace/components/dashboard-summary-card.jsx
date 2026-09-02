import { Link } from 'react-router';

function DashboardSummaryCard({
  label,
  value,
  description,
  href,
  isLoading = false,
  isError = false,
}) {
  let displayedValue = value;

  if (isLoading) displayedValue = 'Chargement…';
  if (isError) displayedValue = 'Indisponible';

  const content = (
    <article className="h-full rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm transition-colors hover:border-primary/30">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{displayedValue}</p>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
    </article>
  );

  if (!href || isLoading || isError) return content;

  return (
    <Link className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" to={href}>
      {content}
    </Link>
  );
}

export { DashboardSummaryCard };
