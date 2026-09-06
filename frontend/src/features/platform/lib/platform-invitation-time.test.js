import { describe, expect, it } from 'vitest';

import {
  formatInvitationDate,
  formatInvitationRelativeTime,
  getInvitationAgeLabel,
  getInvitationDeliveryTimeLabel,
  getInvitationExpirationPresentation,
} from '@/features/platform/lib/platform-invitation-time';

const NOW = new Date('2026-09-06T12:00:00.000Z');

describe('platform invitation time presentation', () => {
  it('formate les dates réelles sans inventer de valeur pour une date absente', () => {
    expect(formatInvitationDate('2026-09-06T10:00:00.000Z')).not.toBe('—');
    expect(formatInvitationDate(null)).toBe('—');
    expect(formatInvitationDate('invalid')).toBe('—');
  });

  it('calcule une ancienneté relative à partir du timestamp de création', () => {
    expect(getInvitationAgeLabel({
      createdAt: '2026-09-03T12:00:00.000Z',
    }, { now: NOW })).toBe('Créée il y a 3 jours');

    expect(getInvitationAgeLabel({}, { now: NOW })).toBe(
      'Date de création indisponible',
    );
  });

  it('distingue dernier envoi réussi, tentative échouée et attente initiale', () => {
    expect(getInvitationDeliveryTimeLabel({
      deliveryStatus: 'sent',
      deliveredAt: '2026-09-06T09:00:00.000Z',
    }, { now: NOW })).toBe('Dernier envoi réussi il y a 3 heures');

    expect(getInvitationDeliveryTimeLabel({
      deliveryStatus: 'failed',
      lastDeliveryAttemptAt: '2026-09-06T11:30:00.000Z',
    }, { now: NOW })).toBe('Dernière tentative il y a 30 minutes');

    expect(getInvitationDeliveryTimeLabel({
      deliveryStatus: 'pending',
      lastDeliveryAttemptAt: null,
    }, { now: NOW })).toBe('En attente du premier envoi');
  });

  it('présente le temps restant et la date absolue d’expiration', () => {
    const presentation = getInvitationExpirationPresentation({
      expiresAt: '2026-09-09T12:00:00.000Z',
    }, { now: NOW });

    expect(presentation.relativeLabel).toBe('Expire dans 3 jours');
    expect(presentation.absoluteLabel).not.toBe('—');
  });

  it('reste robuste sur les valeurs proches et les timestamps invalides', () => {
    expect(formatInvitationRelativeTime(
      '2026-09-06T12:00:20.000Z',
      { now: NOW },
    )).toBe('dans moins d’une minute');

    expect(getInvitationExpirationPresentation({
      expiresAt: 'invalid',
    }, { now: NOW })).toEqual({
      absoluteLabel: '—',
      relativeLabel: 'Expiration indisponible',
    });
  });
});
