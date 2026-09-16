import { useParams } from 'react-router';

import {
  useGetWorkspaceHelpCatalogQuery,
  useGetWorkspaceHelpEntryQuery,
} from '@/features/help/api/help-api';
import { HelpPage } from '@/features/help/components/help-page';

function WorkspaceHelpPage() {
  const { workspaceId, entryId } = useParams();
  const catalogQuery = useGetWorkspaceHelpCatalogQuery(workspaceId);
  const entryQuery = useGetWorkspaceHelpEntryQuery(
    { workspaceId, entryId },
    { skip: !entryId },
  );

  return (
    <HelpPage
      basePath={`/workspaces/${workspaceId}/help`}
      catalog={catalogQuery.data}
      catalogError={catalogQuery.error}
      catalogLoading={catalogQuery.isLoading}
      description="Retrouvez uniquement les procédures disponibles avec vos droits, votre offre et l’état actuel de ce workspace."
      entry={entryQuery.data}
      entryError={entryQuery.error}
      entryId={entryId}
      entryLoading={entryQuery.isLoading}
      title="Centre d’aide du workspace"
    />
  );
}

export { WorkspaceHelpPage };
