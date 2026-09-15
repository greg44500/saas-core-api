import {
  CreditCard,
  Files,
  FolderOpen,
  History,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  Wrench,
} from 'lucide-react';

import { WORKSPACE_FEATURE } from '@/features/workspace/constants/workspace-features';
import { WORKSPACE_PERMISSION } from '@/features/workspace/constants/workspace-permissions';

/**
 * Navigation fournie par le Core.
 *
 * Ce registre décrit uniquement les surfaces génériques du workspace. Les
 * modules métier d'une application dérivée sont composés au niveau `app/` et
 * ne doivent jamais être importés par le Core.
 */
const coreWorkspaceNavigation = Object.freeze([
  Object.freeze({
    id: 'dashboard',
    type: 'item',
    label: 'Tableau de bord',
    Icon: LayoutDashboard,
    path: 'dashboard',
  }),
  Object.freeze({
    id: 'resources',
    type: 'group',
    label: 'Ressources',
    Icon: FolderOpen,
    items: Object.freeze([
      Object.freeze({
        id: 'files',
        label: 'Fichiers',
        Icon: Files,
        permission: WORKSPACE_PERMISSION.FILE_READ,
        path: 'files',
      }),
    ]),
  }),
  Object.freeze({
    id: 'workspace-management',
    type: 'group',
    label: 'Gestion du workspace',
    Icon: Wrench,
    items: Object.freeze([
      Object.freeze({
        id: 'members',
        label: 'Membres',
        Icon: Users,
        permission: WORKSPACE_PERMISSION.MEMBER_READ,
        feature: WORKSPACE_FEATURE.TEAM_MANAGEMENT,
        path: 'members',
      }),
      Object.freeze({
        id: 'roles',
        label: 'Rôles et permissions',
        Icon: ShieldCheck,
        permission: WORKSPACE_PERMISSION.ROLE_READ,
        feature: WORKSPACE_FEATURE.TEAM_MANAGEMENT,
        path: 'roles',
      }),
      Object.freeze({
        id: 'settings',
        label: 'Paramètres',
        Icon: Settings,
        permission: WORKSPACE_PERMISSION.WORKSPACE_UPDATE,
        path: 'settings',
      }),
    ]),
  }),
  Object.freeze({
    id: 'account-offer',
    type: 'group',
    label: 'Compte & offre',
    Icon: WalletCards,
    items: Object.freeze([
      Object.freeze({
        id: 'subscription',
        label: 'Abonnement',
        Icon: CreditCard,
        permission: WORKSPACE_PERMISSION.SUBSCRIPTION_READ,
        path: 'subscription',
      }),
      Object.freeze({
        id: 'activity',
        label: 'Activité',
        Icon: History,
        permission: WORKSPACE_PERMISSION.AUDIT_READ,
        feature: WORKSPACE_FEATURE.AUDIT_LOGS,
        path: 'activity',
      }),
    ]),
  }),
]);

export { coreWorkspaceNavigation };
