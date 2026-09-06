function PlatformAccessSummary({ platformAccess }) {
  if (!platformAccess) {
    return null;
  }

  const roleName = platformAccess.role?.name ?? null;
  const isSuspended = platformAccess.status === 'suspended';

  if (!platformAccess.isFounder && !roleName && !isSuspended) {
    return null;
  }

  return (
    <div
      aria-label="Contexte d’administration de la Plateforme"
      className="mt-2 flex flex-wrap items-center gap-2"
    >
      {platformAccess.isFounder && (
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          Fondateur
        </span>
      )}

      {roleName && (
        <span className="text-xs text-muted-foreground">
          Rôle : <span className="font-medium text-foreground">{roleName}</span>
        </span>
      )}

      {isSuspended && (
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Accès suspendu
        </span>
      )}
    </div>
  );
}

export { PlatformAccessSummary };
