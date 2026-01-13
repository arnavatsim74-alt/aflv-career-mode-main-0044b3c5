import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plane, ExternalLink, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Chart {
  id: string;
  airport_icao: string;
  chart_name: string;
  chart_url: string;
  chart_type: string;
}

interface AirportGroup {
  icao: string;
  charts: Chart[];
  expanded: boolean;
}

export default function AeronauticalCharts() {
  const { user, isAdmin, loading } = useAuth();
  const [airportGroups, setAirportGroups] = useState<AirportGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [airportIcao, setAirportIcao] = useState('');
  const [chartName, setChartName] = useState('');
  const [chartUrl, setChartUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCharts();
    }
  }, [user]);

  const fetchCharts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('aeronautical_charts')
      .select('*')
      .order('airport_icao');

    if (error) {
      toast.error('Failed to load charts');
    } else {
      // Group charts by airport
      const groups: { [key: string]: Chart[] } = {};
      (data || []).forEach((chart) => {
        if (!groups[chart.airport_icao]) {
          groups[chart.airport_icao] = [];
        }
        groups[chart.airport_icao].push(chart);
      });

      const airportGroupsArray = Object.keys(groups).map((icao) => ({
        icao,
        charts: groups[icao],
        expanded: false,
      }));

      setAirportGroups(airportGroupsArray);
    }
    setIsLoading(false);
  };

  const toggleAirport = (icao: string) => {
    setAirportGroups((prev) =>
      prev.map((group) =>
        group.icao === icao ? { ...group, expanded: !group.expanded } : group
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!airportIcao.trim() || !chartName.trim() || !chartUrl.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('aeronautical_charts')
      .insert({
        airport_icao: airportIcao.trim().toUpperCase(),
        chart_name: chartName.trim(),
        chart_url: chartUrl.trim(),
        created_by: user!.id,
      });

    if (error) {
      toast.error('Failed to add chart');
    } else {
      toast.success('Chart added successfully');
      setAirportIcao('');
      setChartName('');
      setChartUrl('');
      setShowForm(false);
      fetchCharts();
    }
    setIsSaving(false);
  };

  const deleteChart = async (id: string) => {
    const { error } = await supabase
      .from('aeronautical_charts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete chart');
    } else {
      toast.success('Chart deleted');
      fetchCharts();
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
            <h1 className="text-2xl font-bold text-foreground">Aeronautical Charts</h1>
            <p className="text-muted-foreground">Airport approach and departure charts</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowForm(!showForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              {showForm ? 'Cancel' : 'Add Chart'}
            </Button>
          )}
        </div>

        {/* Admin Form */}
        {isAdmin && showForm && (
          <SectionCard title="Add Chart">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  placeholder="Airport ICAO (e.g., UUEE)"
                  value={airportIcao}
                  onChange={(e) => setAirportIcao(e.target.value)}
                />
                <Input
                  placeholder="Chart Name (e.g., ILS RWY 06L)"
                  value={chartName}
                  onChange={(e) => setChartName(e.target.value)}
                />
                <Input
                  placeholder="Chart URL"
                  value={chartUrl}
                  onChange={(e) => setChartUrl(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Adding...' : 'Add Chart'}
              </Button>
            </form>
          </SectionCard>
        )}

        {/* Charts List */}
        {airportGroups.length === 0 ? (
          <SectionCard>
            <div className="text-center py-12">
              <Plane className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2 text-card-foreground">No Charts Available</h3>
              <p className="text-muted-foreground">
                {isAdmin ? 'Add some charts to get started.' : 'No aeronautical charts have been added yet.'}
              </p>
            </div>
          </SectionCard>
        ) : (
          <div className="space-y-4">
            {airportGroups.map((group) => (
              <div key={group.icao} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Airport Header */}
                <button
                  onClick={() => toggleAirport(group.icao)}
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Plane className="h-5 w-5 text-primary" />
                    <span className="font-bold text-primary">{group.icao}</span>
                    <span className="text-muted-foreground">({group.charts.length} chart{group.charts.length !== 1 ? 's' : ''})</span>
                  </div>
                  {group.expanded ? (
                    <ChevronDown className="h-5 w-5 text-warning" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-warning" />
                  )}
                </button>

                {/* Charts */}
                {group.expanded && (
                  <div className="border-t border-border">
                    {group.charts.map((chart) => (
                      <div
                        key={chart.id}
                        className="p-4 border-b border-border last:border-b-0 bg-secondary/30"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                            <span className="font-medium text-card-foreground">{chart.chart_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(chart.chart_url, '_blank')}
                              className="gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Open in New Tab
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteChart(chart.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
