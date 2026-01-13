import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Info, Bell, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Notam {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
}

export function NotamCard() {
  const [latestNotam, setLatestNotam] = useState<Notam | null>(null);

  useEffect(() => {
    fetchLatestNotam();
  }, []);

  const fetchLatestNotam = async () => {
    const { data } = await supabase
      .from('notams')
      .select('id, title, content, priority, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setLatestNotam(data[0]);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'important':
        return <Bell className="h-5 w-5 text-warning" />;
      default:
        return <Info className="h-5 w-5 text-info" />;
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-destructive';
      case 'important':
        return 'border-l-warning';
      default:
        return 'border-l-info';
    }
  };

  if (!latestNotam) {
    return null;
  }

  return (
    <Link
      to="/notams"
      className={`block mb-6 p-4 bg-card rounded-xl border border-border border-l-4 ${getPriorityBorder(latestNotam.priority)} hover:bg-secondary/50 transition-colors`}
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5">{getPriorityIcon(latestNotam.priority)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-card-foreground truncate">{latestNotam.title}</h3>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{latestNotam.content}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(latestNotam.created_at).toLocaleString('ru-RU')}
          </p>
        </div>
      </div>
    </Link>
  );
}
