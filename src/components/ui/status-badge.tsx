import { cn } from '@/lib/utils';

type StatusType = 'pending' | 'approved' | 'rejected' | 'completed' | 'assigned' | 'awaiting_approval' | 'cancelled' | 'active' | 'dispatched';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: 'Pending Review',
    className: 'bg-warning/20 text-warning border-warning/40',
  },
  approved: {
    label: 'Approved',
    className: 'bg-success/20 text-success border-success/40',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/20 text-destructive border-destructive/40',
  },
  completed: {
    label: 'Completed',
    className: 'bg-success/20 text-success border-success/40',
  },
  assigned: {
    label: 'Assigned',
    className: 'bg-info/20 text-info border-info/40',
  },
  awaiting_approval: {
    label: 'Awaiting Approval',
    className: 'bg-warning/20 text-warning border-warning/40',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted text-muted-foreground border-muted',
  },
  active: {
    label: 'ACTIVE',
    className: 'bg-success/20 text-success border-success/40',
  },
  dispatched: {
    label: 'DISPATCHED',
    className: 'bg-warning/20 text-warning border-warning/40',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      config.className,
      className
    )}>
      {config.label}
    </span>
  );
}