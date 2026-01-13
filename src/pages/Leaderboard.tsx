import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plane, Trophy, Clock, DollarSign } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/ui/section-card';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeaderboardEntry {
  id: string;
  name: string;
  callsign: string;
  total_hours: number;
  total_flights: number;
  money: number;
  rank: string;
  base_airport: string | null;
}

export default function Leaderboard() {
  const { user, loading } = useAuth();
  const [pilots, setPilots] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
    }
  }, [user]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    
    const { data } = await supabase
      .from('profiles')
      .select('id, name, callsign, total_hours, total_flights, money, rank, base_airport')
      .order('total_hours', { ascending: false })
      .limit(50);

    if (data) {
      setPilots(data);
    }
    
    setIsLoading(false);
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

  const sortedByHours = [...pilots].sort((a, b) => b.total_hours - a.total_hours);
  const sortedByEarnings = [...pilots].sort((a, b) => Number(b.money) - Number(a.money));

  const renderLeaderboard = (data: LeaderboardEntry[], metric: 'hours' | 'earnings') => (
    <div className="space-y-2">
      {data.map((pilot, index) => (
        <div 
          key={pilot.id}
          className={`flex items-center gap-4 p-4 rounded-lg border ${
            index === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
            index === 1 ? 'bg-gray-400/10 border-gray-400/30' :
            index === 2 ? 'bg-orange-600/10 border-orange-600/30' :
            'bg-card border-border'
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
            index === 0 ? 'bg-yellow-500 text-yellow-950' :
            index === 1 ? 'bg-gray-400 text-gray-950' :
            index === 2 ? 'bg-orange-600 text-orange-950' :
            'bg-muted text-muted-foreground'
          }`}>
            {index + 1}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-card-foreground truncate">{pilot.name}</p>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {pilot.callsign}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{pilot.rank} • {pilot.base_airport || 'No Base'}</p>
          </div>
          
          <div className="text-right">
            {metric === 'hours' ? (
              <div className="flex items-center gap-1 text-info">
                <Clock className="h-4 w-4" />
                <span className="font-bold">{Number(pilot.total_hours).toFixed(1)}h</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-success">
                <DollarSign className="h-4 w-4" />
                <span className="font-bold">{formatCurrency(Number(pilot.money))}</span>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {data.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No pilots on the leaderboard yet.</p>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Pilot Leaderboard
        </h1>
        <p className="text-muted-foreground">Top pilots ranked by performance</p>
      </div>

      <SectionCard title="Rankings" icon={<Trophy className="h-5 w-5 text-muted-foreground" />}>
        <Tabs defaultValue="hours" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="hours" className="gap-2">
              <Clock className="h-4 w-4" />
              By Flight Hours
            </TabsTrigger>
            <TabsTrigger value="earnings" className="gap-2">
              <DollarSign className="h-4 w-4" />
              By Earnings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="hours">
            {renderLeaderboard(sortedByHours, 'hours')}
          </TabsContent>
          
          <TabsContent value="earnings">
            {renderLeaderboard(sortedByEarnings, 'earnings')}
          </TabsContent>
        </Tabs>
      </SectionCard>
    </DashboardLayout>
  );
}
