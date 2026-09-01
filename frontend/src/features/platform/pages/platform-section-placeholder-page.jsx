function PlatformSectionPlaceholderPage({ title, description }) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Cette section est prête dans la navigation Platform. Son intégration métier sera réalisée dans un lot dédié.
      </div>
    </section>
  );
}

function PlatformUsersPlaceholderPage() {
  return (
    <PlatformSectionPlaceholderPage
      title="Utilisateurs"
      description="Administration globale des comptes utilisateurs de la plateforme."
    />
  );
}

function PlatformWorkspacesPlaceholderPage() {
  return (
    <PlatformSectionPlaceholderPage
      title="Workspaces"
      description="Supervision globale des workspaces et de leur état administratif."
    />
  );
}

function PlatformPlansPlaceholderPage() {
  return (
    <PlatformSectionPlaceholderPage
      title="Plans"
      description="Gestion du catalogue des plans exposés par la plateforme."
    />
  );
}

function PlatformSubscriptionsPlaceholderPage() {
  return (
    <PlatformSectionPlaceholderPage
      title="Abonnements"
      description="Supervision des subscriptions et de leur cycle de vie."
    />
  );
}

function PlatformAuditLogsPlaceholderPage() {
  return (
    <PlatformSectionPlaceholderPage
      title="Audit logs"
      description="Consultation des événements d’administration et de sécurité de la plateforme."
    />
  );
}

export {
  PlatformAuditLogsPlaceholderPage,
  PlatformPlansPlaceholderPage,
  PlatformSectionPlaceholderPage,
  PlatformSubscriptionsPlaceholderPage,
  PlatformUsersPlaceholderPage,
  PlatformWorkspacesPlaceholderPage,
};
