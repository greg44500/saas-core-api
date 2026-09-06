const PLATFORM_TEAM_MEMBER_STATUS_PRESENTATION = Object.freeze({
  active: Object.freeze({
    label: 'Actif',
    className: 'border-primary/30 bg-primary/10 text-primary',
  }),
  suspended: Object.freeze({
    label: 'Suspendu',
    className: 'border-border bg-muted text-muted-foreground',
  }),
});

function PlatformTeamMemberStatusBadge({ status }) {
  const presentation = PLATFORM_TEAM_MEMBER_STATUS_PRESENTATION[status] ?? {
    label: status ?? '—',
    className: 'border-border bg-background text-muted-foreground',
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${presentation.className}`}
    >
      {presentation.label}
    </span>
  );
}

export {
  PLATFORM_TEAM_MEMBER_STATUS_PRESENTATION,
  PlatformTeamMemberStatusBadge,
};
