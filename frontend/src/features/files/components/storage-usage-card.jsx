import { HardDrive } from 'lucide-react';

import { InfoTooltip } from '@/components/shared/info-tooltip';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFileSize } from '@/features/files/lib/file-formatters';

function resolveStoragePresentation(storage) {
  if (!storage || storage.unlimited) {
    return {
      percentage: null,
      label: 'Stockage illimité',
      indicatorClassName: 'bg-primary',
    };
  }

  const { usedBytes = 0, limitBytes = 0, overLimit = false } = storage;
  const percentage = limitBytes === 0
    ? (usedBytes > 0 ? 100 : 0)
    : Math.min((usedBytes / limitBytes) * 100, 100);

  if (overLimit || percentage >= 95) {
    return {
      percentage,
      label: overLimit ? 'Limite dépassée' : 'Stockage critique',
      indicatorClassName: 'bg-destructive',
    };
  }

  if (percentage >= 85) {
    return {
      percentage,
      label: 'Stockage bientôt saturé',
      indicatorClassName: 'bg-warning',
    };
  }

  if (percentage >= 70) {
    return {
      percentage,
      label: 'Stockage à surveiller',
      indicatorClassName: 'bg-info',
    };
  }

  return {
    percentage,
    label: 'Capacité disponible',
    indicatorClassName: 'bg-primary',
  };
}

function StorageUsageCard({
  activeCount = null,
  deletedCount = null,
  isError = false,
  isLoading = false,
  onRetry,
  storage = null,
}) {
  const presentation = resolveStoragePresentation(storage);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">
            <HardDrive aria-hidden="true" className="size-5" />
          </div>
          <div className="flex min-w-0 items-center gap-1">
            <CardTitle as="h2">Stockage</CardTitle>
            <InfoTooltip
              content="Le stockage inclut les fichiers actifs et les fichiers supprimés encore conservés avant leur suppression définitive."
              label="À propos du stockage"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div aria-live="polite" className="space-y-4" role="status">
            <span className="sr-only">Chargement de l’utilisation du stockage…</span>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-5 w-72" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-start gap-3" role="alert">
            <p className="text-sm text-destructive">
              Impossible de charger l’utilisation du stockage.
            </p>
            {onRetry ? (
              <Button onClick={onRetry} size="sm" type="button" variant="outline">
                Réessayer
              </Button>
            ) : null}
          </div>
        ) : storage ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {formatFileSize(storage.usedBytes)}
                  {storage.unlimited ? null : (
                    <span className="text-base font-normal text-muted-foreground">
                      {' '}sur {formatFileSize(storage.limitBytes)}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm font-medium">
                  {presentation.label}
                </p>
              </div>

              {!storage.unlimited ? (
                <p className="text-lg font-semibold tabular-nums">
                  {Math.round(presentation.percentage)} %
                </p>
              ) : null}
            </div>

            {!storage.unlimited ? (
              <Progress
                aria-valuetext={`${Math.round(presentation.percentage)} % du stockage utilisé`}
                indicatorClassName={presentation.indicatorClassName}
                value={presentation.percentage}
              />
            ) : null}

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {!storage.unlimited ? (
                <span>
                  {formatFileSize(storage.remainingBytes)} disponibles
                </span>
              ) : null}
              {activeCount !== null ? (
                <span>
                  {activeCount} fichier{activeCount === 1 ? '' : 's'} actif{activeCount === 1 ? '' : 's'}
                </span>
              ) : null}
              {deletedCount !== null ? (
                <span>
                  {deletedCount} fichier{deletedCount === 1 ? '' : 's'} dans la corbeille
                </span>
              ) : null}
            </div>

            {deletedCount !== null ? (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Les fichiers placés dans la corbeille continuent d’occuper leur espace jusqu’à leur suppression définitive.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export {
  StorageUsageCard,
  resolveStoragePresentation,
};
