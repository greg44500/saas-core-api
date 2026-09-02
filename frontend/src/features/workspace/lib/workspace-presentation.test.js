import { describe, expect, it } from 'vitest';

import {
  formatDashboardCount,
  formatWorkspaceStatus,
} from '@/features/workspace/lib/workspace-presentation';

describe('workspace presentation', () => {
  it('localise les statuts connus du workspace', () => {
    expect(formatWorkspaceStatus('active')).toBe('Actif');
    expect(formatWorkspaceStatus('suspended')).toBe('Suspendu');
    expect(formatWorkspaceStatus('archived')).toBe('Archivé');
  });

  it('formate les compteurs sans inventer une valeur absente', () => {
    expect(formatDashboardCount(1234)).toBe(new Intl.NumberFormat('fr-FR').format(1234));
    expect(formatDashboardCount(null)).toBe('—');
    expect(formatDashboardCount(-1)).toBe('—');
  });
});
