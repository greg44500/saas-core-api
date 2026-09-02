const AUDIT_ACTION_OPTIONS = Object.freeze([
  ['LOGIN_SUCCESS', 'Connexion réussie'],
  ['LOGIN_FAILED', 'Échec de connexion'],
  ['LOGOUT', 'Déconnexion'],
  ['LOGOUT_ALL', 'Déconnexion de toutes les sessions'],
  ['PASSWORD_CHANGED', 'Mot de passe modifié'],
  ['PASSWORD_RESET_COMPLETED', 'Mot de passe réinitialisé'],
  ['USER_CREATED', 'Utilisateur créé'],
  ['USER_PROFILE_UPDATED', 'Profil utilisateur modifié'],
  ['USER_DISABLED', 'Utilisateur désactivé'],
  ['USER_ENABLED', 'Utilisateur réactivé'],
  ['USER_PLATFORM_ROLE_UPDATED', 'Rôle plateforme modifié'],
  ['SESSION_REVOKED', 'Session révoquée'],
  ['SESSION_REUSE_DETECTED', 'Réutilisation de session détectée'],
  ['WORKSPACE_CREATED', 'Workspace créé'],
  ['WORKSPACE_UPDATED', 'Workspace modifié'],
  ['WORKSPACE_SUSPENDED', 'Workspace suspendu'],
  ['WORKSPACE_REACTIVATED', 'Workspace réactivé'],
  ['WORKSPACE_CLOSED', 'Workspace fermé'],
  ['WORKSPACE_OWNERSHIP_TRANSFERRED', 'Propriété du workspace transférée'],
  ['MEMBER_INVITED', 'Membre invité'],
  ['MEMBER_INVITATION_ACCEPTED', 'Invitation acceptée'],
  ['MEMBER_INVITATION_REVOKED', 'Invitation révoquée'],
  ['MEMBER_INVITATION_RESENT', 'Invitation renvoyée'],
  ['MEMBER_ROLE_UPDATED', 'Rôle d’un membre modifié'],
  ['MEMBER_SUSPENDED', 'Membre suspendu'],
  ['MEMBER_REMOVED', 'Membre retiré'],
  ['ROLE_CREATED', 'Rôle créé'],
  ['ROLE_UPDATED', 'Rôle modifié'],
  ['ROLE_DELETED', 'Rôle supprimé'],
  ['PLAN_CREATED', 'Plan créé'],
  ['PLAN_UPDATED', 'Plan modifié'],
  ['PLAN_ARCHIVED', 'Plan archivé'],
  ['SUBSCRIPTION_CREATED', 'Abonnement créé'],
  ['SUBSCRIPTION_UPDATED', 'Abonnement modifié'],
  ['SUBSCRIPTION_CANCELLATION_SCHEDULED', 'Résiliation programmée'],
  ['SUBSCRIPTION_CANCELED', 'Abonnement résilié'],
  ['SUBSCRIPTION_EXPIRED', 'Abonnement expiré'],
  ['SUBSCRIPTION_ACTIVATED_FROM_TRIAL', 'Abonnement activé après essai'],
  ['SUBSCRIPTION_PROMOTION_APPLIED', 'Promotion appliquée'],
  ['SUBSCRIPTION_RESUMED', 'Abonnement repris'],
  ['SUBSCRIPTION_DOWNGRADE_SCHEDULED', 'Changement vers une offre inférieure programmé'],
  ['SUBSCRIPTION_DOWNGRADE_REVOKED', 'Changement vers une offre inférieure annulé'],
  ['SUBSCRIPTION_DOWNGRADE_APPLIED', 'Changement vers une offre inférieure appliqué'],
  ['FILE_UPLOADED', 'Fichier ajouté'],
  ['FILE_UPLOAD_REJECTED', 'Ajout de fichier refusé'],
  ['FILE_DELETED', 'Fichier supprimé'],
  ['FILE_PURGED', 'Fichier purgé'],
  ['ORGANIZATION_CREATED', 'Organisation créée'],
  ['ORGANIZATION_UPDATED', 'Organisation modifiée'],
  ['ORGANIZATION_SUSPENDED', 'Organisation suspendue'],
  ['ORGANIZATION_REACTIVATED', 'Organisation réactivée'],
]);

const AUDIT_ENTITY_TYPE_OPTIONS = Object.freeze([
  ['AuthSession', 'Session'],
  ['File', 'Fichier'],
  ['Organization', 'Organisation'],
  ['Plan', 'Plan'],
  ['Role', 'Rôle'],
  ['Subscription', 'Abonnement'],
  ['User', 'Utilisateur'],
  ['Workspace', 'Workspace'],
  ['WorkspaceInvitation', 'Invitation'],
  ['WorkspaceMember', 'Membre'],
]);

const AUDIT_STATUS_OPTIONS = Object.freeze([
  ['success', 'Réussie'],
  ['failed', 'Échouée'],
]);

const actionLabels = new Map(AUDIT_ACTION_OPTIONS);
const entityTypeLabels = new Map(AUDIT_ENTITY_TYPE_OPTIONS);
const statusLabels = new Map(AUDIT_STATUS_OPTIONS);

function formatTechnicalFallback(value) {
  if (!value) return 'Non renseigné';

  return String(value)
    .replaceAll('_', ' ')
    .toLocaleLowerCase('fr-FR')
    .replace(/^./, (character) => character.toLocaleUpperCase('fr-FR'));
}

function getAuditActionLabel(action) {
  return actionLabels.get(action) ?? formatTechnicalFallback(action);
}

function getAuditEntityTypeLabel(entityType) {
  return entityTypeLabels.get(entityType) ?? formatTechnicalFallback(entityType);
}

function getAuditStatusLabel(status) {
  return statusLabels.get(status) ?? formatTechnicalFallback(status);
}

function getAuditActorLabel(actor) {
  if (!actor) return 'Système';

  const fullName = [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim();
  return fullName || actor.email || 'Utilisateur';
}

function formatAuditAbsoluteDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatAuditRelativeDate(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  const differenceInSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absoluteDifference = Math.abs(differenceInSeconds);

  if (absoluteDifference < 45) return 'À l’instant';

  const units = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ];

  const [unit, secondsPerUnit] = units.find(([, seconds]) => absoluteDifference >= seconds) ?? [
    'second',
    1,
  ];

  return new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' }).format(
    Math.round(differenceInSeconds / secondsPerUnit),
    unit,
  );
}

function dateInputToIsoBoundary(value, boundary) {
  if (!value) return undefined;

  const time = boundary === 'end' ? '23:59:59.999' : '00:00:00.000';
  const date = new Date(`${value}T${time}`);

  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export {
  AUDIT_ACTION_OPTIONS,
  AUDIT_ENTITY_TYPE_OPTIONS,
  AUDIT_STATUS_OPTIONS,
  dateInputToIsoBoundary,
  formatAuditAbsoluteDate,
  formatAuditRelativeDate,
  getAuditActionLabel,
  getAuditActorLabel,
  getAuditEntityTypeLabel,
  getAuditStatusLabel,
};
