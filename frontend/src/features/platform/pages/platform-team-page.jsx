import { Navigate, useParams } from 'react-router';

import { PageLoader } from '@/components/shared/page-loader';
import { SectionTabs } from '@/components/shared/section-tabs';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import { PLATFORM_PERMISSION } from '@/features/platform/constants/platform-permissions';

const PLATFORM_TEAM_SECTIONS = Object.freeze([
  Object.freeze({
    key: 'members',
    label: 'Membres',
    to: '/platform/team/members',
    permission: PLATFORM_PERMISSION.TEAM_READ,
    description:
      'Consultez les collaborateurs internes, leur rôle et leur statut d’accès à la Plateforme.',
  }),
  Object.freeze({
    key: 'invitations',
    label: 'Invitations',
    to: '/platform/team/invitations',
    permission: PLATFORM_PERMISSION.TEAM_READ,
    description:
      'Suivez les invitations envoyées et leur cycle de vie avant l’entrée dans l’équipe.',
  }),
  Object.freeze({
    key: 'roles',
    label: 'Rôles et permissions',
    to: '/platform/team/roles',
    permission: PLATFORM_PERMISSION.ROLES_READ,
    description:
      'Consultez les rôles système et personnalisés ainsi que leurs permissions effectives.',
  }),
]);

function getVisiblePlatformTeamSections(permissions) {
  const permissionSet = new Set(permissions ?? []);

  return PLATFORM_TEAM_SECTIONS.filter(
    ({ permission }) => permissionSet.has(permission),
  );
}

function PlatformTeamPage() {
  const { section } = useParams();
  const {
    data: platformAccess,
    isLoading,
    isFetching,
  } = useGetCurrentPlatformContextQuery();

  if (isLoading || (isFetching && platformAccess === undefined)) {
    return <PageLoader />;
  }

  const visibleSections = getVisiblePlatformTeamSections(
    platformAccess?.permissions,
  );

  if (visibleSections.length === 0) {
    return <Navigate replace to="/workspaces" />;
  }

  const activeSection = visibleSections.find(
    ({ key }) => key === section,
  );

  if (!activeSection) {
    return <Navigate replace to={visibleSections[0].to} />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Équipe de la Plateforme
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Gérez les collaborateurs internes, les invitations et la répartition des rôles sans mélanger les droits de la Plateforme avec ceux des workspaces clients.
        </p>
      </header>

      <SectionTabs
        ariaLabel="Navigation de l’équipe de la Plateforme"
        items={visibleSections}
      />

      <section
        aria-labelledby="platform-team-section-title"
        className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
      >
        <h2
          className="text-lg font-semibold"
          id="platform-team-section-title"
        >
          {activeSection.label}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {activeSection.description}
        </p>
      </section>
    </div>
  );
}

export {
  PLATFORM_TEAM_SECTIONS,
  PlatformTeamPage,
  getVisiblePlatformTeamSections,
};
