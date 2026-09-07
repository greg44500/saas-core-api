import { PlatformFounderBadge } from '@/features/platform/components/platform-founder-badge';
import { PlatformTeamMemberStatusBadge } from '@/features/platform/components/platform-team-member-status-badge';

function formatPlatformTeamMemberName(member) {
  const user = member?.user;
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || 'Membre';
}

function createPlatformTeamMemberReadColumns({
  currentUserId = null,
  markCurrentUser = false,
  compact = false,
} = {}) {
  const compactClasses = compact
    ? {
      member: {
        headerClassName: 'w-[30%]',
        cellClassName: 'w-[30%] break-words align-middle',
      },
      distinction: {
        headerClassName: 'w-[21%]',
        cellClassName: 'w-[21%] whitespace-nowrap align-middle',
      },
      role: {
        headerClassName: 'w-[29%]',
        cellClassName: 'w-[29%] break-words align-middle',
      },
      status: {
        headerClassName: 'w-[20%]',
        cellClassName: 'w-[20%] whitespace-nowrap align-middle',
      },
    }
    : {};

  return [
    {
      id: 'member',
      header: 'Membre',
      ...compactClasses.member,
      cell: (member) => (
        <p className="font-medium text-foreground">
          {formatPlatformTeamMemberName(member)}
          {markCurrentUser && member.user?.id === currentUserId
            ? ' (vous)'
            : ''}
        </p>
      ),
    },
    {
      id: 'distinction',
      header: 'Qualité',
      ...compactClasses.distinction,
      cell: (member) => (
        member.isFounder
          ? <PlatformFounderBadge />
          : (
            <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              Membre plateforme
            </span>
          )
      ),
    },
    {
      id: 'role',
      header: 'Rôle',
      ...compactClasses.role,
      cell: (member) => member.role?.name ?? '—',
    },
    {
      id: 'status',
      header: 'Statut',
      ...compactClasses.status,
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
