import { cn } from '@/lib/utils';

/**
 * Indicateur de progression générique pour les parcours multi-étapes.
 *
 * Les étapes terminées, active et à venir sont dérivées de `currentStep`. Le
 * composant expose l'étape courante aux technologies d'assistance sans rendre
 * la compréhension dépendante d'un tooltip ou de la couleur seule.
 */
function ProgressStepper({
  steps,
  currentStep,
  ariaLabel = 'Progression',
  className,
}) {
  const activeStep = steps[currentStep - 1];

  return (
    <nav aria-label={ariaLabel} className={cn('space-y-3', className)}>
      <ol className="grid grid-cols-[repeat(var(--step-count),minmax(0,1fr))] items-start" style={{ '--step-count': steps.length }}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isLast = stepNumber === steps.length;

          return (
            <li className="relative flex min-w-0 flex-col items-center" key={step.id}>
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-1/2 top-4 h-0.5 w-full bg-border',
                    isComplete && 'bg-primary',
                  )}
                />
              )}

              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'relative z-10 grid size-8 place-items-center rounded-full border bg-background text-sm font-semibold text-muted-foreground transition-colors',
                  isComplete && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-primary/10 text-primary ring-4 ring-primary/10',
                )}
                title={`Étape ${stepNumber} : ${step.label}`}
              >
                {isComplete ? '✓' : stepNumber}
              </span>

              <span
                className={cn(
                  'mt-2 hidden max-w-full text-center text-xs font-medium text-muted-foreground sm:block',
                  isCurrent && 'text-foreground',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>

      {activeStep && (
        <p className="text-center text-xs font-medium text-muted-foreground" role="status">
          Étape {currentStep} sur {steps.length} — {activeStep.label}
        </p>
      )}
    </nav>
  );
}

export { ProgressStepper };
