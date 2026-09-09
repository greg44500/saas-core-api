import { cn } from '@/lib/utils';

/**
 * État vide transverse pour les listes, tableaux et sections du Core.
 *
 * La feature fournit le sens métier ; le composant ne décide jamais si une
 * absence de données est normale, filtrée ou liée à un droit.
 */
function EmptyState({ title, description, action = null, className }) {
  return (
    <div className={cn('space-y-2 p-5', className)}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export { EmptyState };
