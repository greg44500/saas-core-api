import { describe, expect, it } from 'vitest';

import {
  dateInputToIsoBoundary,
  formatAuditAbsoluteDate,
  formatAuditRelativeDate,
  getAuditActionLabel,
  getAuditActorLabel,
  getAuditEntityTypeLabel,
  getAuditStatusLabel,
} from '@/features/audit-log/lib/audit-log-presentation';

describe('audit log presentation', () => {
  it('traduit les valeurs techniques connues en libellés français', () => {
    expect(getAuditActionLabel('WORKSPACE_OWNERSHIP_TRANSFERRED')).toBe(
      'Propriété du workspace transférée',
    );
    expect(getAuditEntityTypeLabel('WorkspaceMember')).toBe('Membre');
    expect(getAuditStatusLabel('failed')).toBe('Échouée');
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
