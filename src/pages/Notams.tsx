import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plane, AlertTriangle, Info, Bell, Plus, Trash2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Notam {
  id: string;
  title: string;
  content: string;
  priority: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export default function Notams() {
  const { user, isAdmin, loading } = useAuth();
  const [notams, setNotams] = useState<Notam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotams();
    }
  }, [user]);

  const fetchNotams = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('notams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load NOTAMs');
    } else {
      setNotams(data || []);
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('notams')
      .insert({
        title: title.trim(),
        content: content.trim(),
        priority,
        created_by: user!.id,
      });

    if (error) {
      toast.error('Failed to create NOTAM');
    } else {
      toast.success('NOTAM published successfully');
      setTitle('');
      setContent('');
      setPriority('normal');
      setShowForm(false);
      fetchNotams();
    }
    setIsSaving(false);
  };

  const deleteNotam = async (id: string) => {
    const { error } = await supabase
      .from('notams')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete NOTAM');
    } else {
      toast.success('NOTAM deleted');
      fetchNotams();
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

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-4 border-l-destructive bg-destructive/5';
      case 'important':
        return 'border-l-4 border-l-warning bg-warning/5';
      default:
        return 'border-l-4 border-l-info bg-info/5';
    }
  };

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Plane className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">NOTAM</h1>
            <p className="text-muted-foreground">Notices to Airmen</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              {showForm ? 'Cancel' : 'New NOTAM'}
            </Button>
          )}
        </div>

        {/* Admin Form */}
        {isAdmin && showForm && (
          <SectionCard title="Publish NOTAM">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="NOTAM Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <Textarea
                  placeholder="NOTAM Content..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-4">
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="important">Important</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Publishing...' : 'Publish NOTAM'}
                </Button>
              </div>
            </form>
          </SectionCard>
        )}

        {/* NOTAMs List */}
        {notams.length === 0 ? (
          <SectionCard>
            <div className="text-center py-12">
              <Info className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2 text-card-foreground">No Active NOTAMs</h3>
              <p className="text-muted-foreground">
                There are currently no notices to display.
              </p>
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-4">
            {notams.map((notam) => (
              <div
                key={notam.id}
                className={`p-4 rounded-xl ${getPriorityBg(notam.priority)} bg-card border border-border`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getPriorityIcon(notam.priority)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-card-foreground">{notam.title}</h3>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotam(notam.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{notam.content}</p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Published: {new Date(notam.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
