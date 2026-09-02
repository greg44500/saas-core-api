import { describe, expect, it } from 'vitest';

import {
  formatInvitationDeliveryStatus,
  formatInvitationStatus,
  formatMemberStatus,
} from '@/features/workspace-members/lib/workspace-member-formatters';

describe('workspace member formatters', () => {
  it('traduit les statuts visibles connus en français', () => {
    expect(formatMemberStatus('active')).toBe('Actif');
    expect(formatMemberStatus('suspended')).toBe('Suspendu');
    expect(formatMemberStatus('removed')).toBe('Retiré');
    expect(formatInvitationStatus('pending')).toBe('En attente');
    expect(formatInvitationStatus('accepted')).toBe('Acceptée');
    expect(formatInvitationDeliveryStatus('sent')).toBe('Envoyée');
    expect(formatInvitationDeliveryStatus('failed')).toBe('Échec');
  });

  it('conserve une valeur future inconnue au lieu de masquer le contrat', () => {
    expect(formatMemberStatus('future_status')).toBe('future_status');
    expect(formatInvitationStatus('future_status')).toBe('future_status');
  });
});
