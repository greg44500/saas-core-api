import { useParams } from 'react-router';

import {
  useGetPlatformHelpCatalogQuery,
  useGetPlatformHelpEntryQuery,
} from '@/features/help/api/help-api';
import { HelpPage } from '@/features/help/components/help-page';

function PlatformHelpPage() {
  const { entryId } = useParams();
  const catalogQuery = useGetPlatformHelpCatalogQuery();
  const entryQuery = useGetPlatformHelpEntryQuery(entryId, {
    skip: !entryId,
  });

  return (
    <HelpPage
      basePath="/platform/help"
      catalog={catalogQuery.data}
      catalogError={catalogQuery.error}
      catalogLoading={catalogQuery.isLoading}
      description="Consultez les procédures d’administration correspondant strictement à vos permissions Platform effectives."
      entry={entryQuery.data}
      entryError={entryQuery.error}
      entryId={entryId}
      entryLoading={entryQuery.isLoading}
      title="Centre d’aide Platform"
    />
  );
}

export { PlatformHelpPage };
