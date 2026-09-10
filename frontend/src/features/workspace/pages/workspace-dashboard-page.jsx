import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSummaryCard } from '@/features/workspace/components/dashboard-summary-card';
import { useWorkspaceDashboardWidgets } from '@/features/workspace/hooks/use-workspace-dashboard-widgets';

function getSummaryGridClass(itemCount) {
  if (itemCount <= 1) return 'grid grid-cols-1 gap-4';
  if (itemCount === 2) return 'grid grid-cols-1 gap-4 sm:grid-cols-2';
  return 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3';
}

function WorkspaceDashboardPage() {
  const {
    workspace,
    accessibleWidgets,
    visibleWidgets,
    isPreferencesLoading,
  } = useWorkspaceDashboardWidgets();
  const summaryWidgets = visibleWidgets.filter((widget) => widget.slot === 'summary');
  const contentWidgets = visibleWidgets.filter((widget) => widget.slot === 'content');
  const pendingSummaryWidgets = isPreferencesLoading
    ? accessibleWidgets.filter((widget) => widget.configurable && widget.slot === 'summary')
    : [];
  const hasPendingContent = isPreferencesLoading
    && accessibleWidgets.some((widget) => widget.configurable && widget.slot === 'content');
  const renderedSummaryCount = summaryWidgets.length + pendingSummaryWidgets.length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">{workspace.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Vue synthétique du workspace courant. Les indicateurs affichés respectent les fonctionnalités réellement disponibles, les permissions de votre rôle et vos préférences personnelles d’affichage.
        </p>
      </header>

      <section
        aria-label="Synthèse du workspace"
        className={getSummaryGridClass(renderedSummaryCount)}
      >
        {summaryWidgets.map((widget) => {
          const Widget = widget.component;
          return <Widget key={widget.id} />;
        })}

        {pendingSummaryWidgets.map((widget) => (
          <DashboardSummaryCard
            description={widget.description}
            isLoading
            key={`loading-${widget.id}`}
            label={widget.label}
          />
        ))}
      </section>

      {contentWidgets.map((widget) => {
        const Widget = widget.component;
        return <Widget key={widget.id} />;
      })}

      {hasPendingContent && (
        <section
          aria-live="polite"
          className="space-y-3 rounded-xl border border-border p-5"
          role="status"
        >
          <span className="sr-only">Chargement des préférences du tableau de bord…</span>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-20 w-full" />
        </section>
      )}
    </div>
  );
}

export { WorkspaceDashboardPage, getSummaryGridClass };
