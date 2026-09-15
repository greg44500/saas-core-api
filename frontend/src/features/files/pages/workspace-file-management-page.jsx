import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  useGetWorkspaceFileStorageQuery,
  useListWorkspaceFilesQuery,
  useListWorkspaceFileTrashQuery,
} from '@/features/files/api/files-api';
import { StorageUsageCard } from '@/features/files/components/storage-usage-card';
import { WorkspaceFileTrashPage } from '@/features/files/pages/workspace-file-trash-page';
import { WorkspaceFilesPage } from '@/features/files/pages/workspace-files-page';
import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

const SUMMARY_LIMIT = 1;
const ACTIVE_TAB = 'active';
const TRASH_TAB = 'trash';

function WorkspaceFileManagementPage() {
  const { workspace, can } = useWorkspaceContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const canViewTrash = can(WORKSPACE_PERMISSION.FILE_TRASH_READ);

  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === TRASH_TAB && canViewTrash
    ? TRASH_TAB
    : ACTIVE_TAB;

  const storageQuery = useGetWorkspaceFileStorageQuery(workspace.id);
  const activeSummaryQuery = useListWorkspaceFilesQuery({
    workspaceId: workspace.id,
    page: 1,
    limit: SUMMARY_LIMIT,
  });
  const trashSummaryQuery = useListWorkspaceFileTrashQuery(
    {
      workspaceId: workspace.id,
      page: 1,
      limit: SUMMARY_LIMIT,
    },
    {
      skip: !canViewTrash,
    },
  );

  const activeCount = activeSummaryQuery.data?.pagination?.total ?? null;
  const deletedCount = canViewTrash
    ? (trashSummaryQuery.data?.pagination?.total ?? null)
    : null;

  const storageLoading = storageQuery.isLoading
    || (activeSummaryQuery.isLoading && activeCount === null)
    || (canViewTrash && trashSummaryQuery.isLoading && deletedCount === null);

  const storageError = Boolean(storageQuery.error);

  const description = useMemo(
    () => `Gérez les fichiers et la capacité de stockage de ${workspace.name}.`,
    [workspace.name],
  );

  function handleTabChange(value) {
    const nextParams = new URLSearchParams(searchParams);

    if (value === TRASH_TAB) {
      nextParams.set('tab', TRASH_TAB);
    } else {
      nextParams.delete('tab');
    }

    setSearchParams(nextParams, { replace: true });
  }

  function retryStorageSummary() {
    storageQuery.refetch();
    activeSummaryQuery.refetch();
    if (canViewTrash) trashSummaryQuery.refetch();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fichiers</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <InfoTooltip
          content="Le stockage inclut les fichiers actifs et les fichiers supprimés encore conservés avant leur purge définitive."
          label="À propos du stockage des fichiers"
        />
      </div>

      <StorageUsageCard
        activeCount={activeCount}
        deletedCount={deletedCount}
        isError={storageError}
        isLoading={storageLoading}
        onRetry={retryStorageSummary}
        storage={storageQuery.data ?? null}
      />

      <Tabs onValueChange={handleTabChange} value={activeTab}>
        <TabsList aria-label="Cycle de vie des fichiers">
          <TabsTrigger value={ACTIVE_TAB}>
            Fichiers actifs
            {activeCount !== null ? (
              <span className="ml-1 text-xs tabular-nums text-muted-foreground">
                {activeCount}
              </span>
            ) : null}
          </TabsTrigger>

          {canViewTrash ? (
            <TabsTrigger value={TRASH_TAB}>
              Corbeille
              {deletedCount !== null ? (
                <span className="ml-1 text-xs tabular-nums text-muted-foreground">
                  {deletedCount}
                </span>
              ) : null}
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value={ACTIVE_TAB}>
          {activeTab === ACTIVE_TAB ? <WorkspaceFilesPage embedded /> : null}
        </TabsContent>

        {canViewTrash ? (
          <TabsContent value={TRASH_TAB}>
            {activeTab === TRASH_TAB ? <WorkspaceFileTrashPage embedded /> : null}
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}

export {
  ACTIVE_TAB,
  SUMMARY_LIMIT,
  TRASH_TAB,
  WorkspaceFileManagementPage,
};
