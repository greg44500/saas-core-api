function AccountClosureImpact({ impact }) {
  const workspacesToArchive = impact?.workspacesToArchive ?? [];
  const memberOnlyWorkspaces = impact?.memberOnlyWorkspaces ?? [];
  const summary = impact?.summary ?? {};

  return (
    <div className="mt-4 space-y-4 text-sm">
      <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
        <p className="font-medium text-foreground">Conséquences de la fermeture</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Votre compte et toutes vos sessions seront fermés.</li>
          <li>
            {summary.membershipRemovalCount ?? 0} appartenance(s) à des workspaces seront retirées.
          </li>
          <li>
            {summary.workspaceArchiveCount ?? 0} workspace(s) dont vous êtes propriétaire seront archivés.
          </li>
          {(summary.otherActiveMemberCount ?? 0) > 0 && (
            <li>
              {summary.otherActiveMemberCount} autre(s) membre(s) perdront l’accès aux workspaces archivés.
            </li>
          )}
          {(summary.affectedSubscriptionCount ?? 0) > 0 && (
            <li>
              {summary.affectedSubscriptionCount} abonnement(s) commercial(aux) lié(s) à ces workspaces seront neutralisés.
            </li>
          )}
        </ul>
      </div>

      {workspacesToArchive.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Workspaces qui seront archivés</p>
          <ul className="space-y-2">
            {workspacesToArchive.map((workspace) => (
              <li
                className="rounded-md border border-border bg-muted/30 px-3 py-2"
                key={workspace.id}
              >
                <span className="font-medium text-foreground">{workspace.name}</span>
                <span className="ml-2 text-muted-foreground">
                  {workspace.otherActiveMemberCount > 0
                    ? `${workspace.otherActiveMemberCount} autre(s) membre(s) impacté(s)`
                    : 'aucun autre membre actif'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {memberOnlyWorkspaces.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-foreground">Workspaces qui resteront actifs</p>
          <p className="text-muted-foreground">
            Vous perdrez uniquement votre accès à ces workspaces ; ils ne seront pas archivés.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {memberOnlyWorkspaces.map((workspace) => (
              <li key={workspace.id}>{workspace.name}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="rounded-md border border-border bg-muted/30 p-3 text-muted-foreground">
        Les données ne sont pas immédiatement supprimées. Elles restent soumises aux règles de conservation,
        d’anonymisation et de suppression applicables au service.
      </p>
    </div>
  );
}

export { AccountClosureImpact };
