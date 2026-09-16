import { Link } from 'react-router';

import { HelpCenter, HelpCenterSkeleton, HelpErrorState } from '@/features/help/components/help-center';
import { HelpEntryView } from '@/features/help/components/help-entry-view';

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
  if (!entryId) {
    return (
      <HelpCenter
        basePath={basePath}
        catalog={catalog}
        description={description}
        error={catalogError}
        isLoading={catalogLoading}
        title={title}
      />
    );
  }

  if (catalogLoading || entryLoading) {
    return (
      <section className="mx-auto w-full max-w-4xl space-y-6">
        <HelpCenterSkeleton />
      </section>
    );
  }

  if (entryError?.status === 404) {
    return (
      <section className="mx-auto w-full max-w-4xl space-y-4">
        <HelpErrorState message="Cette aide n’existe pas ou n’est pas disponible avec vos droits actuels." />
        <Link className="text-sm font-medium text-primary hover:underline" to={basePath}>
          Retour au centre d’aide
        </Link>
      </section>
    );
  }

  if (catalogError || entryError || !catalog || !entry) {
    return (
      <section className="mx-auto w-full max-w-4xl">
        <HelpErrorState message="Impossible de charger cette aide dans le contexte actuel." />
      </section>
    );
  }

  return (
    <HelpEntryView
      basePath={basePath}
      catalog={catalog}
      entry={entry}
    />
  );
}

export { HelpPage };
