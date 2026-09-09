import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * État d'erreur transverse pour les lectures serveur.
 *
 * La feature conserve le message métier et décide si un retry est possible.
 * Ce composant centralise uniquement la hiérarchie visuelle et l'annonce de
 * l'erreur afin d'éviter des variantes locales ambiguës.
 */
function ErrorState({
  title,
  description,
  retryLabel = 'Réessayer',
  onRetry,
  className,
}) {
  return (
    <div
      className={cn('space-y-3 p-5', className)}
      role="alert"
    >
      <div className="space-y-1">
        <p className="text-sm font-medium text-destructive">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
