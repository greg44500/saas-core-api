import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CollapsibleCard } from '@/components/data-display/collapsible-card';
import { MetricCard } from '@/components/data-display/metric-card';
import { DashboardSection } from '@/components/shared/dashboard-section';

const OVERVIEW_METRICS = Object.freeze([
  {
    title: 'Utilisateurs',
    description: 'Comptes inscrits sur la plateforme',
  },
  {
    title: 'Espaces de travail',
    description: 'Tenants clients créés',
  },
  {
    title: 'Abonnements actifs',
    description: 'Contrats commerciaux actuellement actifs',
  },
  {
    title: 'MRR contractuel estimé',
    description: 'Valeur contractuelle, hors preuve d’encaissement',
  },
]);

function PlaceholderPanel({ title, description }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-40 items-center justify-center rounded-lg bg-muted/40 px-6 text-center text-sm text-muted-foreground">
          Les données agrégées seront affichées ici dès que le contrat Platform Overview sera connecté.
        </div>
      </CardContent>
    </Card>
  );
}

function PlatformOverviewPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-primary">Plateforme</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Vue d’ensemble</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Analyse globale de l’activité, des abonnements et de la santé de la plateforme.
        </p>
      </header>

      <section
        aria-label="Indicateurs principaux"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {OVERVIEW_METRICS.map((metric) => (
          <MetricCard
            description={metric.description}
            key={metric.title}
            title={metric.title}
            value="—"
          />
        ))}
      </section>

      <DashboardSection
        description="Suivez la progression de la plateforme et la structure du parc client sur la période sélectionnée."
        title="Croissance et répartition"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <PlaceholderPanel
            description="Évolution des utilisateurs et des espaces de travail."
            title="Croissance de la plateforme"
          />
          <PlaceholderPanel
            description="Nombre et pourcentage des espaces de travail par plan effectif."
            title="Répartition par plan"
          />
        </div>
      </DashboardSection>

      <DashboardSection
        description="Les informations secondaires restent accessibles sans surcharger la lecture initiale."
        title="Santé et exploitation"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <CollapsibleCard
            description="Consommation agrégée des métriques déclarées par l’application."
            summary={(
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Stockage</dt>
                  <dd className="mt-1 font-semibold">—</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Téléversements</dt>
                  <dd className="mt-1 font-semibold">—</dd>
                </div>
              </dl>
            )}
            title="Usage de la plateforme"
          >
            <p className="text-sm text-muted-foreground">
              Le détail présentera les métriques d’usage disponibles dans le registre applicatif, sans coder de métriques métier dans le Core.
            </p>
          </CollapsibleCard>

          <CollapsibleCard
            description="Échéances commerciales et exceptions nécessitant une surveillance."
            summary={(
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Trials à échéance</dt>
                  <dd className="mt-1 font-semibold">—</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Dérogations actives</dt>
                  <dd className="mt-1 font-semibold">—</dd>
                </div>
              </dl>
            )}
            title="Échéances et exceptions"
          >
            <p className="text-sm text-muted-foreground">
              Les prochaines expirations, résiliations, downgrades et dérogations pourront être détaillées ici lorsque les agrégats seront disponibles.
            </p>
          </CollapsibleCard>
        </div>
      </DashboardSection>

      <DashboardSection
        description="Les situations importantes seront priorisées dans un tableau réutilisable une fois le contrat backend défini."
        title="Points nécessitant une attention"
      >
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Aucun point d’attention n’est encore chargé. Ce bloc utilisera le composant DataTable partagé et ne créera pas une nouvelle implémentation de tableau.
            </p>
          </CardContent>
        </Card>
      </DashboardSection>
    </div>
  );
}

export { OVERVIEW_METRICS, PlatformOverviewPage, PlaceholderPanel };
