import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TREND_TONE_CLASS = Object.freeze({
  positive: 'text-success',
  negative: 'text-destructive',
  neutral: 'text-muted-foreground',
});

/**
 * Carte KPI générique pour les dashboards.
 *
 * Le composant ne calcule aucune métrique : il reçoit une valeur déjà résolue
 * par la couche serveur/RTK Query et ne gère que sa présentation. Cette
 * séparation évite qu'une règle d'analyse commerciale se retrouve dupliquée
 * dans plusieurs écrans.
 */
function MetricCard({
  title,
  value,
  description,
  trend,
  trendLabel,
  trendTone = 'neutral',
  className,
}) {
  const trendClassName = TREND_TONE_CLASS[trendTone]
    ?? TREND_TONE_CLASS.neutral;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle
          as="p"
          className="text-sm font-medium text-muted-foreground"
        >
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {(trend || trendLabel) && (
          <p className={cn('mt-2 text-sm', trendClassName)}>
            {trend && <span className="font-medium">{trend}</span>}
            {trend && trendLabel ? ' ' : null}
            {trendLabel}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export { MetricCard, TREND_TONE_CLASS };
