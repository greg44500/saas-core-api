import { PlatformFounderBadge } from '@/features/platform/components/platform-founder-badge';
import { PlatformTeamMemberStatusBadge } from '@/features/platform/components/platform-team-member-status-badge';

function formatPlatformTeamMemberName(member) {
  const user = member?.user;
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user?.email || 'Membre';
}

function createPlatformTeamMemberReadColumns({
  currentUserId = null,
  markCurrentUser = false,
} = {}) {
  return [
    {
      id: 'member',
      header: 'Membre',
      cell: (member) => (
        <div>
          <p className="font-medium text-foreground">
            {formatPlatformTeamMemberName(member)}
            {markCurrentUser && member.user?.id === currentUserId
              ? ' (vous)'
              : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            {member.user?.email ?? '—'}
          </p>
        </div>
      ),
    },
    {
      id: 'distinction',
      header: 'Qualité',
      cell: (member) => (
        member.isFounder
          ? <PlatformFounderBadge />
          : <span className="text-muted-foreground">—</span>
      ),
    },
    {
      id: 'role',
      header: 'Rôle',
      cell: (member) => member.role?.name ?? '—',
    },
    {
      id: 'status',
      header: 'Statut',
      cell: (member) => (
        <PlatformTeamMemberStatusBadge status={member.status} />
      ),
    },
  ];
}

export {
  createPlatformTeamMemberReadColumns,
  formatPlatformTeamMemberName,
};
