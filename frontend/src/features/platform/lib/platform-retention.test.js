import { describe, expect, it } from 'vitest';

import {
  buildManualRetentionExecutionPayload,
  buildRetentionPolicyPayload,
  createRetentionPolicyFormState,
  getRetentionExecutionErrorLabel,
  getRetentionManualExecutionAvailability,
} from '@/features/platform/lib/platform-retention';

const target = {
  key: 'audit_log',
  bounds: {
    retentionDays: { min: 1, max: 36500 },
    batchSize: { min: 1, max: 500 },
    maxBatchesPerRun: { min: 1, max: 100 },
    scheduleIntervalMinutes: { min: 60, max: 525600 },
  },
};

describe('platform retention frontend contract', () => {
  it('n’invente aucune durée lorsqu’aucune politique n’existe', () => {
    expect(createRetentionPolicyFormState(null)).toEqual({
      enabled: false,
      retentionDays: '',
      batchSize: '',
      maxBatchesPerRun: '',
      scheduleEnabled: false,
      scheduleIntervalMinutes: '',
      manualExecutionEnabled: false,
    });
  });

  it('construit uniquement le body autorisé pour une nouvelle version de politique', () => {
    const result = buildRetentionPolicyPayload({
      currentPolicy: { version: 4 },
      target,
      form: {
        enabled: true,
        retentionDays: '365',
        batchSize: '100',
        maxBatchesPerRun: '10',
        scheduleEnabled: true,
        scheduleIntervalMinutes: '1440',
        manualExecutionEnabled: true,
      },
    });

    expect(result.errors).toEqual({});
    expect(result.payload).toEqual({
      expectedVersion: 4,
      enabled: true,
      retentionDays: 365,
      batchSize: 100,
      maxBatchesPerRun: 10,
      schedule: { intervalMinutes: 1440 },
      manualExecutionEnabled: true,
    });
    expect(result.payload).not.toHaveProperty('targetKey');
    expect(result.payload).not.toHaveProperty('schemaVersion');
    expect(result.payload).not.toHaveProperty('cutoffAt');
  });

  it('respecte les bornes code-owned avant l’appel HTTP', () => {
    const result = buildRetentionPolicyPayload({
      currentPolicy: null,
      target,
      form: {
        enabled: true,
        retentionDays: '0',
        batchSize: '501',
        maxBatchesPerRun: '2.5',
        scheduleEnabled: true,
        scheduleIntervalMinutes: '30',
        manualExecutionEnabled: false,
      },
    });

    expect(result.payload).toBeNull();
    expect(result.errors).toMatchObject({
      retentionDays: expect.any(String),
      batchSize: expect.any(String),
      maxBatchesPerRun: expect.any(String),
      scheduleIntervalMinutes: expect.any(String),
    });
  });

  it('réutilise strictement les gardes renvoyées par la prévisualisation pour la purge manuelle', () => {
    const payload = buildManualRetentionExecutionPayload({
      preview: {
        confirmation: {
          expectedPolicyVersion: 3,
          expectedEligibleCount: 42,
          expectedMaxAffectedThisRun: 20,
          phrase: 'PURGE_AUDIT_LOG_V3',
        },
        cutoffAt: '2025-09-08T10:00:00.000Z',
      },
      confirmation: 'PURGE_AUDIT_LOG_V3',
    });

    expect(payload).toEqual({
      expectedPolicyVersion: 3,
      expectedEligibleCount: 42,
      expectedMaxAffectedThisRun: 20,
      confirmation: 'PURGE_AUDIT_LOG_V3',
    });
    expect(payload).not.toHaveProperty('cutoffAt');
  });

  it('traduit les codes d’erreur techniques pour l’utilisateur', () => {
    expect(getRetentionExecutionErrorLabel('RETENTION_LOCK_LOST'))
      .toBe('Verrou d’exécution perdu');
    expect(getRetentionExecutionErrorLabel('RETENTION_EXECUTION_INTERRUPTED'))
      .toBe('Exécution interrompue');
    expect(getRetentionExecutionErrorLabel('RETENTION_TARGET_EXECUTION_FAILED'))
      .toBe('Échec du traitement de purge');
    expect(getRetentionExecutionErrorLabel('UNKNOWN_CODE'))
      .toBe('Erreur technique non reconnue');
  });

  it('explique pourquoi une purge manuelle est indisponible', () => {
    expect(getRetentionManualExecutionAvailability({
      canExecute: true,
      policy: { config: { enabled: false, manualExecutionEnabled: true } },
      preview: {},
      runtime: { locked: false },
    })).toEqual({
      allowed: false,
      reason: 'La politique de rétention doit être active.',
    });

    expect(getRetentionManualExecutionAvailability({
      canExecute: true,
      policy: { config: { enabled: true, manualExecutionEnabled: true } },
      preview: null,
      runtime: { locked: false },
    })).toEqual({
      allowed: false,
      reason: 'Prévisualisez la purge avant de pouvoir la confirmer.',
    });
  });

  it('autorise l’action UI uniquement lorsque tous les prérequis sont réunis', () => {
    expect(getRetentionManualExecutionAvailability({
      canExecute: true,
      policy: { config: { enabled: true, manualExecutionEnabled: true } },
      preview: { eligibleCount: 12 },
      runtime: { locked: false },
    })).toMatchObject({ allowed: true });

    expect(getRetentionManualExecutionAvailability({
      canExecute: true,
      policy: { config: { enabled: true, manualExecutionEnabled: true } },
      preview: { eligibleCount: 12 },
      runtime: { locked: true },
    })).toEqual({
      allowed: false,
      reason: 'Une autre purge est déjà en cours.',
    });
  });
});
