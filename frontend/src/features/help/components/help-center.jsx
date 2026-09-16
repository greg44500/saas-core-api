import { ArrowRight, CircleHelp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { HelpSearch } from '@/features/help/components/help-search';

function HelpCenterSkeleton() {
  return (
    <div aria-label="Chargement du centre d’aide" className="space-y-6">
      <Skeleton className="h-11 w-full" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

function HelpErrorState({ message }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Centre d’aide indisponible</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function HelpCatalog({ basePath, catalog }) {
  const navigate = useNavigate();
  const categories = catalog?.categories ?? [];
  const entries = catalog?.entries ?? [];
  const [activeCategoryId, setActiveCategoryId] = useState(
    categories[0]?.id ?? '',
  );

  useEffect(() => {
    if (!categories.some(({ id }) => id === activeCategoryId)) {
      setActiveCategoryId(categories[0]?.id ?? '');
    }
  }, [activeCategoryId, categories]);

  const activeCategory = categories.find(
    ({ id }) => id === activeCategoryId,
  );
  const activeEntries = useMemo(
    () => entries.filter(({ categoryId }) => categoryId === activeCategoryId),
    [activeCategoryId, entries],
  );

  if (!categories.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aucune aide disponible</CardTitle>
          <CardDescription>
            Aucune procédure n’est disponible avec vos droits actuels.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <HelpSearch
        entries={entries}
        onSelect={(entry) => navigate(`${basePath}/${entry.id}`)}
      />

      <Tabs onValueChange={setActiveCategoryId} value={activeCategoryId}>
        <TabsList
          aria-label="Catégories du centre d’aide"
          className="overflow-x-auto"
          variant="section"
        >
          {categories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              variant="section"
            >
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent
            key={category.id}
            value={category.id}
            variant="section"
          >
            {category.id === activeCategory?.id ? (
              <div className="space-y-5">
                <div className="flex items-start gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{category.label}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <InfoTooltip content={category.description} />
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeEntries.map((entry) => (
                    <Link
                      className="group block h-40 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      key={entry.id}
                      to={`${basePath}/${entry.id}`}
                    >
                      <Card className="h-full transition-[border-color,background-color,box-shadow] group-hover:border-primary/50 group-hover:bg-accent/25 group-hover:shadow-sm">
                        <CardHeader className="h-full pb-5">
                          <div className="flex h-full items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="line-clamp-2 text-base transition-colors group-hover:text-primary">
                                {entry.title}
                              </CardTitle>
                              <CardDescription className="mt-2 line-clamp-3">
                                {entry.summary}
                              </CardDescription>
                            </div>
                            <ArrowRight
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-primary"
                            />
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function HelpCenter({
  basePath,
  catalog,
  description,
  error,
  isLoading,
  title,
}) {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CircleHelp aria-hidden="true" className="size-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      {isLoading ? <HelpCenterSkeleton /> : null}
      {!isLoading && error ? (
        <HelpErrorState message="Impossible de charger les aides autorisées pour ce contexte." />
      ) : null}
      {!isLoading && !error && catalog ? (
        <HelpCatalog basePath={basePath} catalog={catalog} />
      ) : null}
    </section>
  );
}

export {
  HelpCenter,
  HelpCenterSkeleton,
  HelpErrorState,
};
