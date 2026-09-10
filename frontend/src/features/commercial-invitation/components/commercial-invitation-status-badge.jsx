import { StatusBadge } from '@/components/shared/status-badge';
import {
  formatCommercialInvitationStatus,
} from '@/features/commercial-invitation/lib/commercial-invitation-formatters';

const COMMERCIAL_INVITATION_STATUS_TONE = Object.freeze({
  pending: 'warning',
  accepted: 'success',
  declined: 'destructive',
  revoked: 'destructive',
  expired: 'destructive',
});

function CommercialInvitationStatusBadge({ status }) {
  return (
    <StatusBadge tone={COMMERCIAL_INVITATION_STATUS_TONE[status] ?? 'neutral'}>
      {formatCommercialInvitationStatus(status)}
    </StatusBadge>
  );
}

export {
  COMMERCIAL_INVITATION_STATUS_TONE,
  CommercialInvitationStatusBadge,
};
