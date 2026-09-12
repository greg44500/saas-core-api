import { describe, expect, it } from 'vitest';

import {
  getPlatformEntitlementEffectTone,
  getPlatformEntitlementLifecycleTone,
} from '@/features/platform/components/platform-entitlement-status-badge';

describe('platform entitlement semantic tones', () => {
  it('réserve success et info aux statuts courants ou programmés', () => {
    expect(getPlatformEntitlementLifecycleTone('active')).toBe('success');
    expect(getPlatformEntitlementLifecycleTone('scheduled')).toBe('info');
  });

  it('traite les états terminaux comme de l’historique archivé', () => {
    expect(getPlatformEntitlementLifecycleTone('expired')).toBe('archive');
    expect(getPlatformEntitlementLifecycleTone('revoked')).toBe('archive');
  });

  it('utilise warning pour une fonctionnalité explicitement désactivée', () => {
    expect(getPlatformEntitlementEffectTone({
      targetType: 'feature',
      featureEnabled: false,
    })).toBe('warning');
    expect(getPlatformEntitlementEffectTone({
      targetType: 'feature',
      featureEnabled: true,
    })).toBe('success');
  });
});
