import { DataTable } from '@/components/data-display/data-table';
import { StatusBadge } from '@/components/data-display/status-badge';
import { InfoTooltip } from '@/components/shared/info-tooltip';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  formatAuditAbsoluteDate,
  getAuditActionLabel,
  getAuditEntityTypeLabel,
} from '@/features/audit-log/lib/audit-log-presentation';
import {
  formatPlatformPlanFeature,
  formatPlatformPlanMetric,
} from '@/features/platform/lib/platform-plan-formatters';

const ATTENTION_TYPE_LABEL = Object.freeze({
  subscription_past_due: 'Abonnement en retard',
  workspace_suspended: 'Espace suspendu',
  audit_failed: 'Audit en échec',
  trial_expiring: 'Essai à échéance',
  override_expiring: 'Dérogation à échéance',
});

const ATTENTION_LEVEL_LABEL = Object.freeze({
  warning: 'À vérifier',
  destructive: 'Critique',
  info: 'Information',
  neutral: 'À suivre',
});

function getAttentionTypeLabel(type) {
  return ATTENTION_TYPE_LABEL[type] ?? 'Signal administratif';
}

function getAttentionLevelLabel(level) {
  return ATTENTION_LEVEL_LABEL[level] ?? ATTENTION_LEVEL_LABEL.neutral;
}

function getAttentionWorkspaceLabel(item) {
  if (item.workspace?.name) return item.workspace.name;
  if (item.workspace?.id) return 'Espace non résolu';
  return 'Plateforme';
}

function getAttentionSituation(item) {
  switch (item.type) {
    case 'subscription_past_due':
      return 'Abonnement à régulariser';
    case 'workspace_suspended':
      return 'Accès à l’espace suspendu';
    case 'audit_failed': {
      const action = getAuditActionLabel(item.context?.action);
      const entityType = item.context?.entityType
        ? getAuditEntityTypeLabel(item.context.entityType)
        : null;

      return entityType ? `${action} · ${entityType}` : action;
    }
    case 'trial_expiring':
      return 'Fin de la période d’essai';
    case 'override_expiring': {
      const targetType = item.context?.targetType;
      const targetKey = item.context?.targetKey;

      if (targetType === 'feature') {
        return `Fonctionnalité : ${formatPlatformPlanFeature(targetKey)}`;
      }

      if (targetType === 'limit') {
        return `Limite : ${formatPlatformPlanMetric(targetKey)}`;
      }

      return 'Dérogation commerciale arrivant à échéance';
    }
    default:
      return 'Vérification administrative requise';
  }
}

function formatAttentionReferenceDate(value) {
  if (!value) return 'Non renseignée';
  return formatAuditAbsoluteDate(value);
}

const ATTENTION_COLUMNS = Object.freeze([
  {
    id: 'level',
    header: 'Niveau',
    cell: (item) => (
      <StatusBadge tone={item.level}>
        {getAttentionLevelLabel(item.level)}
      </StatusBadge>
    ),
  },
  {
    id: 'type',
    header: 'Type',
    cell: (item) => (
      <span className="font-medium">{getAttentionTypeLabel(item.type)}</span>
    ),
  },
  {
    id: 'workspace',
    header: 'Espace de travail',
    cell: (item) => getAttentionWorkspaceLabel(item),
  },
  {
    id: 'situation',
    header: 'Situation',
    cell: (item) => getAttentionSituation(item),
  },
  {
    id: 'referenceAt',
    header: 'Date de référence',
    cell: (item) => formatAttentionReferenceDate(item.referenceAt),
    cellClassName: 'whitespace-nowrap',
  },
]);

/**
 * Tableau de pilotage des signaux prioritaires du cockpit Platform.
 *
 * `DataTable` reste l'unique primitive de tableau. Ce composant ne trie ni ne
 * priorise les signaux : l'ordre vient du backend afin qu'une même règle soit
 * appliquée à tous les clients et qu'aucune criticité métier ne soit recréée
 * dans React.
 */
function PlatformAttentionTable({
  items = [],
  totalSignals = 0,
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start gap-2">
          <CardTitle>Détails prioritaires</CardTitle>
          <InfoTooltip
            content="Le tableau affiche au maximum les dix points prioritaires calculés par le backend. Les listes administratives dédiées restent la source exhaustive."
            label="À propos des détails prioritaires"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            Aucun point prioritaire à afficher.
          </p>
        ) : (
          <>
            <DataTable
              columns={ATTENTION_COLUMNS}
              data={items}
              getRowKey={(item) => item.id}
            />
            <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              {items.length} point{items.length === 1 ? '' : 's'} prioritaire{items.length === 1 ? '' : 's'} affiché{items.length === 1 ? '' : 's'} sur {totalSignals} signal{totalSignals === 1 ? '' : 's'} détecté{totalSignals === 1 ? '' : 's'}.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export {
  ATTENTION_COLUMNS,
  ATTENTION_LEVEL_LABEL,
  ATTENTION_TYPE_LABEL,
  PlatformAttentionTable,
  formatAttentionReferenceDate,
  getAttentionLevelLabel,
  getAttentionSituation,
  getAttentionTypeLabel,
  getAttentionWorkspaceLabel,
};
