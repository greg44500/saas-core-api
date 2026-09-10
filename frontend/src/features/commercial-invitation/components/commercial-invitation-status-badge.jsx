import { cn } from '@/lib/utils';
import {
  formatCommercialInvitationStatus,
} from '@/features/commercial-invitation/lib/commercial-invitation-formatters';

const STATUS_CLASSES = Object.freeze({
  pending: 'border-warning/30 bg-warning/10 text-warning',
  accepted: 'border-success/30 bg-success/10 text-success',
  declined: 'border-destructive/30 bg-destructive/10 text-destructive',
  revoked: 'border-destructive/30 bg-destructive/10 text-destructive',
  expired: 'border-destructive/30 bg-destructive/10 text-destructive',
});

function CommercialInvitationStatusBadge({ status }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        STATUS_CLASSES[status] ?? 'border-border bg-muted text-muted-foreground',
      )}
    >
      {formatCommercialInvitationStatus(status)}
    </span>
  );
}

export { CommercialInvitationStatusBadge, STATUS_CLASSES };
