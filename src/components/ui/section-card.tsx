import { ReactNode } from 'react';
import { Plane } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title?: string;
  icon?: ReactNode;
  badge?: number;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, icon, badge, children, className }: SectionCardProps) {
  return (
    <div className={cn(
      "bg-card border border-border rounded-xl overflow-hidden shadow-sm",
      className
    )}>
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          {icon || <Plane className="h-5 w-5 text-muted-foreground" />}
          <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
          {badge !== undefined && badge > 0 && (
            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {badge}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}