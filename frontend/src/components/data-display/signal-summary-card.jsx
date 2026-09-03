import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SIGNAL_TONE_CLASS = Object.freeze({
  neutral: 'text-muted-foreground',
  warning: 'text-warning',
  destructive: 'text-destructive',
  success: 'text-success',
});

function resolveSignalTone(item) {
  if (!Number.isFinite(item.value) || item.value === 0) return 'neutral';
  return item.tone ?? 'warning';
}

/**
 * Synthèse compacte de signaux administratifs de même niveau hiérarchique.
 * Le total reste un contexte de lecture ; les catégories portent l'information
 * actionnable et utilisent des tons sémantiques sans transformer tout signal
 * non nul en incident critique.
 */
function SignalSummaryCard({
  title,
  description,
  total,
  totalLabel = 'signaux détectés',
  items = [],
  className,
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start gap-2">
          <CardTitle>{title}</CardTitle>
          <InfoTooltip content={description} label={`À propos de ${title}`} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-5 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{total}</span>{' '}
          {totalLabel}
        </p>

        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {items.map((item) => {
            const tone = resolveSignalTone(item);

            return (
              <div className="space-y-1" key={item.key}>
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd
                  className={cn(
                    'text-xl font-semibold tabular-nums',
                    SIGNAL_TONE_CLASS[tone] ?? SIGNAL_TONE_CLASS.neutral,
                  )}
                >
                  {item.value}
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}

export { SIGNAL_TONE_CLASS, SignalSummaryCard, resolveSignalTone };
