import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TREND_TONE_CLASS = Object.freeze({
  positive: 'text-success',
  negative: 'text-destructive',
  warning: 'text-warning',
  neutral: 'text-muted-foreground',
});

/**
 * Carte KPI générique pour les dashboards.
 *
 * Le composant ne calcule aucune métrique : il reçoit une valeur déjà résolue
 * par la couche serveur/RTK Query et ne gère que sa présentation. La zone de
 * titre possède une hauteur minimale commune afin que la valeur principale
 * démarre au même niveau, même si un libellé tient sur deux lignes.
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
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader className="min-h-16">
        <div className="flex items-start justify-between gap-2">
          <CardTitle
            as="p"
            className="text-sm font-medium text-muted-foreground"
          >
            {title}
          </CardTitle>
          <InfoTooltip content={description} label={`À propos de ${title}`} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end pt-4">
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
