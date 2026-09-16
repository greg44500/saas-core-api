import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { HelpEntryView } from '@/features/help/components/help-entry-view';

function HelpEntryDrawerSkeleton() {
  return (
    <div aria-label="Chargement de la fiche d’aide" className="space-y-4 p-5">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

function HelpEntryDrawer({
  basePath,
  catalog,
  entry,
  error,
  isLoading,
  onClose,
}) {
  const unavailableMessage = error?.status === 404
    ? 'Cette aide n’existe pas ou n’est pas disponible avec vos droits actuels.'
    : 'Impossible de charger cette aide dans le contexte actuel.';

  return (
    <Sheet
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <SheetContent
        className="w-[min(46rem,100vw)] overflow-y-auto"
        closeButtonClassName="z-20"
        overlayClassName="bg-overlay/30 backdrop-blur-[1px]"
      >
        {isLoading ? (
          <>
            <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 pr-14 backdrop-blur">
              <SheetTitle>Chargement de l’aide</SheetTitle>
              <SheetDescription>
                La procédure autorisée pour ce contexte est en cours de chargement.
              </SheetDescription>
            </SheetHeader>
            <HelpEntryDrawerSkeleton />
          </>
        ) : null}

        {!isLoading && (error || !catalog || !entry) ? (
          <>
            <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 pr-14 backdrop-blur">
              <SheetTitle>Aide indisponible</SheetTitle>
              <SheetDescription>{unavailableMessage}</SheetDescription>
            </SheetHeader>
            <div className="p-5">
              <div
                className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
                role="alert"
              >
                {unavailableMessage}
              </div>
            </div>
          </>
        ) : null}

        {!isLoading && !error && catalog && entry ? (
          <>
            <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background/95 pr-14 backdrop-blur">
              <SheetTitle className="text-xl">{entry.title}</SheetTitle>
              <SheetDescription className="leading-relaxed">
                {entry.summary}
              </SheetDescription>
            </SheetHeader>
            <div className="p-5">
              <HelpEntryView
                basePath={basePath}
                catalog={catalog}
                entry={entry}
              />
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export { HelpEntryDrawer };
