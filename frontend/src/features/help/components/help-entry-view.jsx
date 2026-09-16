import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function HelpEntrySection({ children, title }) {
  if (!children) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

function HelpEntryView({ basePath, catalog, entry }) {
  const catalogEntries = new Map(
    (catalog?.entries ?? []).map((catalogEntry) => [catalogEntry.id, catalogEntry]),
  );
  const relatedEntries = entry.relatedEntryIds
    .map((entryId) => catalogEntries.get(entryId))
    .filter(Boolean);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        to={basePath}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour au centre d’aide
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{entry.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {entry.summary}
        </p>
      </div>

      <HelpEntrySection title="Qui peut effectuer cette action ?">
        <p>{entry.whoCanPerform}</p>
      </HelpEntrySection>

      {entry.prerequisites.length ? (
        <HelpEntrySection title="Prérequis">
          <ul className="list-disc space-y-2 pl-5">
            {entry.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </HelpEntrySection>
      ) : null}

      <HelpEntrySection title="Procédure">
        <ol className="list-decimal space-y-3 pl-5 text-foreground">
          {entry.steps.map((step) => (
            <li key={step} className="pl-1 leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
      </HelpEntrySection>

      <HelpEntrySection title="Résultat attendu">
        <p>{entry.outcome}</p>
      </HelpEntrySection>

      {entry.edgeCases.length ? (
        <HelpEntrySection title="Cas particuliers">
          <ul className="list-disc space-y-2 pl-5">
            {entry.edgeCases.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </HelpEntrySection>
      ) : null}

      {entry.sensitiveConsequences.length ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle aria-hidden="true" className="size-4 text-destructive" />
              Conséquences à connaître
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              {entry.sensitiveConsequences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {relatedEntries.length ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Voir aussi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {relatedEntries.map((relatedEntry) => (
              <Link
                className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 text-sm font-medium outline-none transition-colors hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring"
                key={relatedEntry.id}
                to={`${basePath}/${relatedEntry.id}`}
              >
                <span>{relatedEntry.title}</span>
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { HelpEntryView };
