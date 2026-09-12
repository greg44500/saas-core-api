const numberFormatter = new Intl.NumberFormat('fr-FR');

function formatCount(value) {
  return Number.isFinite(value) ? numberFormatter.format(value) : '—';
}

/**
 * Explique le périmètre du KPI utilisateurs sans assimiler artificiellement
 * les comptes internes aux comptes sans workspace : un même utilisateur peut
 * cumuler plusieurs responsabilités sur la plateforme.
 */
function PlatformUserKpiDescription({ population }) {
  const total = population?.total;
  const withCurrentClientAccess = population?.withCurrentClientAccess;
  const withoutCurrentClientAccess = population?.withoutCurrentClientAccess;

  return (
    <div className="space-y-3">
      <p>
        Nombre total de comptes utilisateurs créés sur la plateforme, qu’ils soient
        actuellement rattachés ou non à un espace de travail client.
      </p>
      <dl className="space-y-1">
        <div className="flex justify-between gap-4">
          <dt>Total des comptes</dt>
          <dd className="font-semibold">{formatCount(total)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Avec accès client actuel</dt>
          <dd className="font-semibold">{formatCount(withCurrentClientAccess)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Sans accès client actuel</dt>
          <dd className="font-semibold">{formatCount(withoutCurrentClientAccess)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">
        « Avec accès client actuel » signifie qu’au moins une appartenance à un
        espace de travail est active ou suspendue. Un compte peut aussi disposer
        parallèlement de responsabilités internes sur la plateforme.
      </p>
    </div>
  );
}

export { PlatformUserKpiDescription };
