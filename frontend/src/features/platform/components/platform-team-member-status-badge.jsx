import { StatusBadge } from '@/components/data-display/status-badge';

const PLATFORM_TEAM_MEMBER_STATUS_PRESENTATION = Object.freeze({
  active: Object.freeze({
    label: 'Actif',
    tone: 'success',
  }),
  suspended: Object.freeze({
    label: 'Suspendu',
    tone: 'warning',
  }),
});

function PlatformTeamMemberStatusBadge({ status }) {
  const presentation = PLATFORM_TEAM_MEMBER_STATUS_PRESENTATION[status] ?? {
    label: status ?? '—',
    tone: 'neutral',
  };

  return (
    <StatusBadge tone={presentation.tone}>
      {presentation.label}
    </StatusBadge>
  );
}

export {
  PLATFORM_TEAM_MEMBER_STATUS_PRESENTATION,
  PlatformTeamMemberStatusBadge,
};
