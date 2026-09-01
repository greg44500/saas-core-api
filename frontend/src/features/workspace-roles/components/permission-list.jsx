const CORE_PERMISSION_LABELS = Object.freeze({
  'workspace:read': 'Consulter le workspace',
  'workspace:update': 'Modifier le workspace',
  'workspace:ownership:transfer': 'Transférer la propriété du workspace',
  'member:read': 'Consulter les membres',
  'member:invite': 'Inviter des membres',
  'member:update': 'Modifier les rôles des membres',
  'member:suspend': 'Suspendre des membres',
  'member:remove': 'Retirer des membres',
  'role:read': 'Consulter les rôles et permissions',
  'role:create': 'Créer des rôles',
  'role:update': 'Modifier des rôles',
  'role:delete': 'Supprimer des rôles',
  'subscription:read': 'Consulter l’abonnement',
  'audit:read': 'Consulter l’historique d’audit',
  'file:read': 'Consulter les fichiers',
  'file:upload': 'Téléverser des fichiers',
  'file:delete': 'Supprimer des fichiers',
});

const DOMAIN_LABELS = Object.freeze({
  workspace: 'Workspace',
  member: 'Membres',
  role: 'Rôles et permissions',
  subscription: 'Abonnement',
  audit: 'Historique',
  file: 'Fichiers',
});

function groupPermissions(permissions) {
  return (permissions ?? []).reduce((groups, permission) => {
    const domain = permission.split(':')[0];
    const label = DOMAIN_LABELS[domain] ?? domain;

    if (!groups[label]) groups[label] = [];
    groups[label].push(permission);
    return groups;
  }, {});
}

function PermissionList({ permissions }) {
  const groups = groupPermissions(permissions);
  const entries = Object.entries(groups);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune permission attribuée.</p>;
  }

  return (
    <div className="space-y-5">
      {entries.map(([group, groupPermissions]) => (
        <section key={group}>
          <h3 className="text-sm font-semibold">{group}</h3>
          <ul className="mt-2 space-y-2">
            {groupPermissions.map((permission) => (
              <li className="rounded-md border border-border bg-muted/30 px-3 py-2" key={permission}>
                <p className="text-sm">{CORE_PERMISSION_LABELS[permission] ?? permission}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{permission}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export { PermissionList, groupPermissions };
