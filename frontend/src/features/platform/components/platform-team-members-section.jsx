import { useState } from 'react';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable } from '@/components/data-display/data-table';
import { Button } from '@/components/ui/button';
import { useListPlatformTeamMembersQuery } from '@/features/platform/api/platform-team-api';
import { PlatformFounderBadge } from '@/features/platform/components/platform-founder-badge';
import { PlatformTeamMemberStatusBadge } from '@/features/platform/components/platform-team-member-status-badge';

const PLATFORM_TEAM_MEMBERS_PAGE_SIZE = 20;

function formatPlatformTeamMemberName(member) {
  const user = member?.user;
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || user?.email || 'Membre';
}

const PLATFORM_TEAM_MEMBER_COLUMNS = Object.freeze([
  Object.freeze({
    id: 'member',
    header: 'Membre',
    cell: (member) => (
      <div>
        <p className="font-medium text-foreground">
          {formatPlatformTeamMemberName(member)}
        </p>
        <p className="text-xs text-muted-foreground">
          {member.user?.email ?? '—'}
        </p>
      </div>
    ),
  }),
  Object.freeze({
    id: 'distinction',
    header: 'Qualité',
    cell: (member) => (
      member.isFounder
        ? <PlatformFounderBadge />
        : <span className="text-muted-foreground">—</span>
    ),
  }),
  Object.freeze({
    id: 'role',
    header: 'Rôle',
    cell: (member) => member.role?.name ?? '—',
  }),
  Object.freeze({
    id: 'status',
    header: 'Statut',
    cell: (member) => (
      <PlatformTeamMemberStatusBadge status={member.status} />
    ),
  }),
]);

function PlatformTeamMembersSection() {
  const [page, setPage] = useState(1);
  const membersQuery = useListPlatformTeamMembersQuery({
    page,
    limit: PLATFORM_TEAM_MEMBERS_PAGE_SIZE,
  });

  if (membersQuery.isLoading) {
    return (
      <p className="mt-5 text-sm text-muted-foreground">
        Chargement des membres…
      </p>
    );
  }

  if (membersQuery.error) {
    return (
      <div className="mt-5 space-y-3">
        <p className="text-sm text-destructive" role="alert">
          Impossible de charger les membres de l’équipe de la Plateforme.
        </p>
        <Button
          onClick={membersQuery.refetch}
          type="button"
          variant="outline"
        >
          Réessayer
        </Button>
      </div>
    );
  }

  const members = membersQuery.data?.members ?? [];
  const pagination = membersQuery.data?.pagination ?? {
    page,
    limit: PLATFORM_TEAM_MEMBERS_PAGE_SIZE,
    total: members.length,
    totalPages: members.length > 0 ? 1 : 0,
  };

  if (members.length === 0) {
    return (
      <p className="mt-5 text-sm text-muted-foreground">
        Aucun membre actif ou suspendu dans l’équipe de la Plateforme.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div className="overflow-hidden rounded-lg border border-border">
        <DataTable
          columns={PLATFORM_TEAM_MEMBER_COLUMNS}
          data={members}
          getRowKey={(member) => member.id}
        />
      </div>

      <DataPagination
        disabled={membersQuery.isFetching}
        onPageChange={setPage}
        page={page}
        pagination={pagination}
        summary={`${pagination.total} membre${pagination.total > 1 ? 's' : ''}`}
      />
    </div>
  );
}

export {
  PLATFORM_TEAM_MEMBER_COLUMNS,
  PLATFORM_TEAM_MEMBERS_PAGE_SIZE,
  PlatformTeamMembersSection,
  formatPlatformTeamMemberName,
};
