import { describe, expect, it } from 'vitest';

import {
  createAuditMetadataLabelMaps,
  dateInputToIsoBoundary,
  formatAuditAbsoluteDate,
  formatAuditRelativeDate,
  getAuditActionLabel,
  getAuditActorLabel,
  getAuditEntityTypeLabel,
  getAuditStatusLabel,
} from '@/features/audit-log/lib/audit-log-presentation';

const metadata = {
  actions: [
    {
      value: 'WORKSPACE_OWNERSHIP_TRANSFERRED',
      label: 'Propriété de l’espace de travail transférée',
    },
    {
      value: 'USER_PROFILE_UPDATED',
      label: 'Profil utilisateur modifié',
    },
  ],
  entityTypes: [
    {
      value: 'WorkspaceMember',
      label: 'Membre d’espace de travail',
    },
    {
      value: 'EntitlementOverride',
      label: 'Dérogation',
    },
  ],
  statuses: [
    {
      value: 'failed',
      label: 'Échouée',
    },
  ],
};

describe('audit log presentation', () => {
  it('utilise les libellés fournis par les métadonnées backend', () => {
    const labelMaps = createAuditMetadataLabelMaps(metadata);

    expect(getAuditActionLabel('WORKSPACE_OWNERSHIP_TRANSFERRED', labelMaps)).toBe(
      'Propriété de l’espace de travail transférée',
    );
    expect(getAuditActionLabel('USER_PROFILE_UPDATED', labelMaps)).toBe(
      'Profil utilisateur modifié',
    );
    expect(getAuditEntityTypeLabel('EntitlementOverride', labelMaps)).toBe('Dérogation');
    expect(getAuditStatusLabel('failed', labelMaps)).toBe('Échouée');
  });

  it('n’affiche jamais une valeur technique inconnue comme libellé utilisateur', () => {
    const labelMaps = createAuditMetadataLabelMaps(metadata);

    expect(getAuditActionLabel('TECHNICAL_UNKNOWN_ACTION', labelMaps)).toBe('Action inconnue');
    expect(getAuditEntityTypeLabel('TechnicalUnknownEntity', labelMaps)).toBe('Ressource inconnue');
    expect(getAuditStatusLabel('technical-status', labelMaps)).toBe('Statut inconnu');
  });

  it('présente un acteur ou le système sans inventer de données', () => {
    expect(
      getAuditActorLabel({ firstName: 'Jean', lastName: 'Dupont', email: 'jean@example.com' }),
    ).toBe('Jean Dupont');
    expect(getAuditActorLabel({ email: 'jean@example.com' })).toBe('jean@example.com');
    expect(getAuditActorLabel(null)).toBe('Système');
  });

  it('formate une date relative et conserve une date absolue lisible', () => {
    const now = new Date('2026-09-02T12:00:00.000Z');
    const value = '2026-09-02T11:00:00.000Z';

    expect(formatAuditRelativeDate(value, now)).toContain('heure');
    expect(formatAuditAbsoluteDate(value)).not.toBe('Date inconnue');
  });

  it('convertit les bornes de date locale en ISO sans dépendre du fuseau de test', () => {
    const start = dateInputToIsoBoundary('2026-09-01', 'start');
    const end = dateInputToIsoBoundary('2026-09-01', 'end');
    const startTime = Date.parse(start);
    const endTime = Date.parse(end);

    expect(Number.isNaN(startTime)).toBe(false);
    expect(Number.isNaN(endTime)).toBe(false);
    expect(start).toBe(new Date(startTime).toISOString());
    expect(end).toBe(new Date(endTime).toISOString());
    expect(startTime).toBeLessThan(endTime);
    expect(dateInputToIsoBoundary('', 'start')).toBeUndefined();
  });
});
