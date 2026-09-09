import { Skeleton } from '@/components/ui/skeleton';

const VARIANT_CLASS_NAMES = Object.freeze({
  default: 'border-border',
  sensitive: 'border-destructive/40',
});

/**
 * Skeleton commun aux sections de paramétrage qui attendent des données
 * serveur avant de pouvoir rendre leurs champs sans ambiguïté.
 */
function FormSectionSkeleton({
  fields = 3,
  label = 'Chargement des paramètres…',
  variant = 'default',
}) {
  const fieldCount = Number.isInteger(fields) && fields > 0 ? fields : 1;
  const variantClassName = VARIANT_CLASS_NAMES[variant]
    ?? VARIANT_CLASS_NAMES.default;

  return (
    <section
      aria-live="polite"
      className={`space-y-5 rounded-xl border bg-card p-6 text-card-foreground ${variantClassName}`}
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: fieldCount }, (_, index) => (
            <div className="space-y-2" key={`form-field-${index}`}>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </section>
  );
}

export { FormSectionSkeleton };
