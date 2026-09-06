function PlatformAccessSummary({
  platformAccess,
  label = null,
  showRole = true,
  variant = 'menu',
}) {
  if (!platformAccess) {
    return null;
  }

  const roleName = platformAccess.role?.name ?? null;
  const isSuspended = platformAccess.status === 'suspended';
  const shouldShowRole = showRole && Boolean(roleName);

  if (!platformAccess.isFounder && !shouldShowRole && !isSuspended) {
    return null;
  }

  const layoutClassName = variant === 'inline'
    ? 'flex flex-wrap items-center gap-2'
    : 'mt-2 flex flex-wrap items-center gap-2';

  return (
    <div
      aria-label="Contexte d’administration de la Plateforme"
      className={layoutClassName}
    >
      {label && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}

      {platformAccess.isFounder && (
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          Fondateur
        </span>
      )}

      {shouldShowRole && (
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
