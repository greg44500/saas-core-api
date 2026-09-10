import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSummaryCard } from '@/features/workspace/components/dashboard-summary-card';
import { useWorkspaceDashboardWidgets } from '@/features/workspace/hooks/use-workspace-dashboard-widgets';

function getSummaryGridClass() {
  return 'grid grid-cols-6 gap-4';
}

/**
 * Répartit la dernière ligne sans laisser un widget isolé sur un tiers de la
 * largeur. La règle dépend uniquement du nombre réellement rendu : les futurs
 * modules métier héritent donc automatiquement du même comportement.
 */
function getSummaryItemClass(index, itemCount) {
  const position = index + 1;
  const isLast = position === itemCount;
  const baseClass = 'col-span-6';
  const smallScreenClass = itemCount > 1 && !(itemCount % 2 === 1 && isLast)
    ? 'sm:col-span-3'
    : 'sm:col-span-6';

  if (itemCount <= 1) {
    return `${baseClass} sm:col-span-6 xl:col-span-6`;
  }

  if (itemCount === 2) {
    return `${baseClass} ${smallScreenClass} xl:col-span-3`;
  }

  if (itemCount === 4) {
    return `${baseClass} ${smallScreenClass} xl:col-span-3`;
  }

  const remainder = itemCount % 3;
  const balancedTailSize = remainder === 1 ? 4 : remainder;
  const firstBalancedTailIndex = itemCount - balancedTailSize;
  const xlClass = remainder === 0 || index < firstBalancedTailIndex
    ? 'xl:col-span-2'
    : 'xl:col-span-3';

  return `${baseClass} ${smallScreenClass} ${xlClass}`;
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
        className={getSummaryGridClass()}
      >
        {summaryWidgets.map((widget, index) => {
          const Widget = widget.component;
          return (
            <div
              className={getSummaryItemClass(index, renderedSummaryCount)}
              key={widget.id}
            >
              <Widget />
            </div>
          );
        })}

        {pendingSummaryWidgets.map((widget, pendingIndex) => {
          const index = summaryWidgets.length + pendingIndex;

          return (
            <div
              className={getSummaryItemClass(index, renderedSummaryCount)}
              key={`loading-${widget.id}`}
            >
              <DashboardSummaryCard
                description={widget.description}
                isLoading
                label={widget.label}
              />
            </div>
          );
        })}
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

export {
  WorkspaceDashboardPage,
  getSummaryGridClass,
  getSummaryItemClass,
};
