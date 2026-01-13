import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  className?: string;
}

export function StatCard({ label, value, className }: StatCardProps) {
  return (
    <div className={cn(
      "bg-primary border border-va-border rounded-lg p-4 text-center",
      className
    )}>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-va-gold">{value}</p>
    </div>
  );
}