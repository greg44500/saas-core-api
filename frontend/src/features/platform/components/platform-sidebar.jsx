import {
  BadgeEuro,
  Building2,
  ClipboardList,
  Database,
  LayoutDashboard,
  Lock,
  MailPlus,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import { useLocation } from 'react-router';

import { AppSidebar } from '@/components/shared/app-sidebar';
import { useGetCurrentPlatformContextQuery } from '@/features/platform/api/platform-current-context-api';
import {
  canDisplayPlatformNavigationItem,
  getActivePlatformNavigationGroupId,
  getVisiblePlatformNavigationSections,
  platformNavigationItems,
  platformNavigationSections,
} from '@/features/platform/lib/platform-navigation';

/**
 * Une icône distincte par entrée réduit les ambiguïtés en mode compact, où
 * l'icône devient le principal repère visuel avant l'affichage du tooltip.
 */
const PLATFORM_NAVIGATION_ICONS = Object.freeze({
  overview: LayoutDashboard,
  clients: Users,
  users: User,
  workspaces: Building2,
  commercial: BadgeEuro,
  plans: Tags,
  subscriptions: ReceiptText,
  'commercial-invitations': MailPlus,
  'entitlement-overrides': SlidersHorizontal,
  'platform-team': ShieldCheck,
  team: UserCog,
  'security-data': Lock,
  'audit-logs': ClipboardList,
  retention: Database,
});

function isPlatformItemActive(item, pathname) {
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function PlatformSidebar() {
  const location = useLocation();
  const { data: platformAccess } = useGetCurrentPlatformContextQuery();
  const visibleNavigation = getVisiblePlatformNavigationSections(
    platformAccess?.permissions,
  );

  return (
    <AppSidebar
      getHref={(item) => item.to}
      getIcon={(entry) => PLATFORM_NAVIGATION_ICONS[entry.id]}
      isItemActive={(item) => isPlatformItemActive(item, location.pathname)}
      navigation={visibleNavigation}
      navigationLabel="Navigation de la plateforme"
      pathname={location.pathname}
      scope=" d’administration"
      title="Administration"
    />
  );
}

export {
  PLATFORM_NAVIGATION_ICONS,
  PlatformSidebar,
  canDisplayPlatformNavigationItem,
  getActivePlatformNavigationGroupId,
  getVisiblePlatformNavigationSections,
  isPlatformItemActive,
  platformNavigationItems,
  platformNavigationSections,
};
