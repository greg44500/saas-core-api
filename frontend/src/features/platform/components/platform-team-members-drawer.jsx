import { useState } from 'react';

import { DataPagination } from '@/components/data-display/data-pagination';
import { DataTable } from '@/components/data-display/data-table';
import { EntityDetailsDrawer } from '@/components/shared/entity-details-drawer';
import { Button } from '@/components/ui/button';
import { useListPlatformTeamMembersQuery } from '@/features/platform/api/platform-team-api';
import {
  createPlatformTeamMemberReadColumns,
} from '@/features/platform/components/platform-team-member-read-columns';

const PLATFORM_TEAM_DRAWER_PAGE_SIZE = 20;

function PlatformTeamMembersDrawer({ onClose, open }) {
  const [page, setPage] = useState(1);
  const membersQuery = useListPlatformTeamMembersQuery(
    { page, limit: PLATFORM_TEAM_DRAWER_PAGE_SIZE },
    { skip: !open },
  );

  const members = membersQuery.data?.members ?? [];
  const pagination = membersQuery.data?.pagination ?? {
    page,
    limit: PLATFORM_TEAM_DRAWER_PAGE_SIZE,
    total: members.length,
    totalPages: members.length > 0 ? 1 : 0,
  };
  const columns = createPlatformTeamMemberReadColumns();

  return (
    <EntityDetailsDrawer
      description="Identité, qualité, rôle et statut des membres actuels de l’équipe interne."
      onClose={onClose}
      open={open}
      title="Équipe de la Plateforme"
    >
      {membersQuery.isLoading && (
        <p className="text-sm text-muted-foreground">
          Chargement des membres…
        </p>
      )}

      {membersQuery.error && (
        <div className="space-y-3">
          <p className="text-sm text-destructive" role="alert">
            Impossible de charger le détail de l’équipe de la Plateforme.
          </p>
          <Button
            onClick={membersQuery.refetch}
            type="button"
            variant="outline"
          >
            Réessayer
          </Button>
        </div>
      )}

      {!membersQuery.isLoading && !membersQuery.error && members.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucun membre actif ou suspendu dans l’équipe de la Plateforme.
        </p>
      )}

      {!membersQuery.isLoading && !membersQuery.error && members.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <DataTable
              columns={columns}
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
        </>
      )}
    </EntityDetailsDrawer>
  );
}

export {
  PLATFORM_TEAM_DRAWER_PAGE_SIZE,
  PlatformTeamMembersDrawer,
};
