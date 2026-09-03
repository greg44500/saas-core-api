import { cn } from '@/lib/utils';

/**
 * Primitive visuelle générique pour les contenus regroupés.
 *
 * La Card centralise la surface, la bordure et le rayon. Les composants métier
 * composent Header/Content/Footer au lieu de réécrire ces choix visuels dans
 * chaque page, ce qui permet de faire évoluer la densité des cartes à un seul
 * endroit sans toucher aux features.
 */
function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return <div className={cn('p-5 pb-0', className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return <h3 className={cn('font-semibold', className)} {...props} />;
}

function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn('mt-1 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex items-center p-5 pt-0', className)}
      {...props}
    />
  );
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
