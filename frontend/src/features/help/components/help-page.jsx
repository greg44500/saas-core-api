import { useNavigate } from 'react-router';

import { HelpCenter } from '@/features/help/components/help-center';
import { HelpEntryDrawer } from '@/features/help/components/help-entry-drawer';

function HelpPage({
  basePath,
  catalog,
  catalogError,
  catalogLoading,
  description,
  entry,
  entryError,
  entryId,
  entryLoading,
  title,
}) {
  const navigate = useNavigate();

  return (
    <>
      <HelpCenter
        basePath={basePath}
        catalog={catalog}
        description={description}
        error={catalogError}
        isLoading={catalogLoading}
        title={title}
      />

      {entryId ? (
        <HelpEntryDrawer
          basePath={basePath}
          catalog={catalog}
          entry={entry}
          error={catalogError ?? entryError}
          isLoading={catalogLoading || entryLoading}
          onClose={() => navigate(basePath, { replace: true })}
        />
      ) : null}
    </>
  );
}

export { HelpPage };
