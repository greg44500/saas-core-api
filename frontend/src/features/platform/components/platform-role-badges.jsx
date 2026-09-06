function PlatformRoleTypeBadge({ isSystem }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {isSystem ? 'Système' : 'Personnalisé'}
    </span>
  );
}

function PlatformRoleStatusBadge({ status }) {
  const isActive = status === 'active';

  return (
    <span
      className={isActive
        ? 'inline-flex rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-xs font-medium text-success'
        : 'inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'}
    >
      {isActive ? 'Actif' : 'Archivé'}
    </span>
  );
}

export { PlatformRoleStatusBadge, PlatformRoleTypeBadge };
