import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function WorkspaceDashboardPage() {
  const { workspace } = useWorkspaceContext();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium text-primary">{workspace.name}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Vue d’ensemble de l’espace de travail courant. Les modules fonctionnels seront raccordés ici au fur et à mesure de leur implémentation.
        </p>
      </header>

      <section aria-label="Informations du workspace" className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Espace de travail</p>
          <p className="mt-2 text-lg font-semibold">{workspace.name}</p>
        </article>
        <article className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
          <p className="text-sm text-muted-foreground">Statut</p>
          <p className="mt-2 text-lg font-semibold">{workspace.status}</p>
        </article>
      </section>
    </div>
  );
}

export { WorkspaceDashboardPage };
