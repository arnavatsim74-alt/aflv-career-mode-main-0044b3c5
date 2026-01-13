import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plane, ShoppingCart, Check, Lock } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';

interface Aircraft {
  id: string;
  name: string;
  type_code: string;
  family: string;
  seats: number;
  price: number;
  description: string | null;
}

interface TypeRating {
  id: string;
  aircraft_id: string;
  is_active: boolean;
}

export default function Shop() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [typeRatings, setTypeRatings] = useState<TypeRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch all aircraft with price > 0 (purchasable)
    const { data: aircraftData } = await supabase
      .from('aircraft')
      .select('*')
      .gt('price', 0)
      .order('price', { ascending: true });

    if (aircraftData) setAircraft(aircraftData);

    // Fetch user's type ratings
    const { data: ratingsData } = await supabase
      .from('type_ratings')
      .select('*')
      .eq('user_id', user!.id);

    if (ratingsData) setTypeRatings(ratingsData);

    setIsLoading(false);
  };

  const purchaseTypeRating = async (aircraftId: string, price: number, name: string) => {
    if (!profile) return;

    const currentMoney = Number(profile.money) || 0;
    if (currentMoney < price) {
      toast.error('Insufficient funds to purchase this type rating');
      return;
    }

    setPurchasing(aircraftId);

    // Deduct money from profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ money: currentMoney - price })
      .eq('user_id', user!.id);

    if (profileError) {
      toast.error('Failed to process payment');
      setPurchasing(null);
      return;
    }

    // Add type rating
    const { error: ratingError } = await supabase
      .from('type_ratings')
      .insert({
        user_id: user!.id,
        aircraft_id: aircraftId,
        is_active: false,
      });

    if (ratingError) {
      // Refund on failure
      await supabase
        .from('profiles')
        .update({ money: currentMoney })
        .eq('user_id', user!.id);
      
      toast.error('Failed to add type rating');
      setPurchasing(null);
      return;
    }

    toast.success(`${name} Type Rating purchased successfully!`);
    await refreshProfile();
    await fetchData();
    setPurchasing(null);
  };

  const setActiveTypeRating = async (aircraftId: string, aircraftFamily: string) => {
    // First, deactivate all type ratings
    await supabase
      .from('type_ratings')
      .update({ is_active: false })
      .eq('user_id', user!.id);

    // Activate the selected one
    const { error } = await supabase
      .from('type_ratings')
      .update({ is_active: true })
      .eq('user_id', user!.id)
      .eq('aircraft_id', aircraftId);

    if (error) {
      toast.error('Failed to set active type rating');
      return;
    }

    // Update profile's active aircraft family
    await supabase
      .from('profiles')
      .update({ active_aircraft_family: aircraftFamily })
      .eq('user_id', user!.id);

    toast.success('Active type rating updated!');
    await refreshProfile();
    await fetchData();
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

  const userMoney = Number(profile?.money) || 0;

  const hasTypeRating = (aircraftId: string) => {
    return typeRatings.some(r => r.aircraft_id === aircraftId);
  };

  const isActiveRating = (aircraftId: string) => {
    return typeRatings.some(r => r.aircraft_id === aircraftId && r.is_active);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Type Rating Shop</h1>
          <p className="text-muted-foreground">Purchase aircraft type ratings to expand your fleet</p>
        </div>
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          <p className="text-sm text-muted-foreground">Your Balance</p>
          <p className="text-xl font-bold text-success">{formatCurrency(userMoney)}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {aircraft.map((ac) => {
          const owned = hasTypeRating(ac.id);
          const active = isActiveRating(ac.id);
          const canAfford = userMoney >= ac.price;

          return (
            <SectionCard key={ac.id} className="relative overflow-hidden">
              {owned && (
                <Badge className="absolute top-4 right-4 bg-success text-success-foreground">
                  <Check className="h-3 w-3 mr-1" />
                  Owned
                </Badge>
              )}
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plane className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-card-foreground">{ac.name}</h3>
                  <p className="text-sm text-muted-foreground">{ac.type_code} • {ac.family}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {ac.description || `Type rating for ${ac.name} aircraft.`}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-secondary/50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="font-bold text-card-foreground">{ac.seats} seats</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-bold text-primary">{formatCurrency(ac.price)}</p>
                </div>
              </div>

              {owned ? (
                active ? (
                  <Button disabled className="w-full gap-2 bg-success/20 text-success border-success/30">
                    <Check className="h-4 w-4" />
                    Active Rating
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setActiveTypeRating(ac.id, ac.family)}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    Set as Active
                  </Button>
                )
              ) : (
                <Button
                  onClick={() => purchaseTypeRating(ac.id, ac.price, ac.name)}
                  disabled={!canAfford || purchasing === ac.id}
                  className="w-full gap-2"
                >
                  {purchasing === ac.id ? (
                    'Processing...'
                  ) : !canAfford ? (
                    <>
                      <Lock className="h-4 w-4" />
                      Insufficient Funds
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      Purchase Type Rating
                    </>
                  )}
                </Button>
              )}
            </SectionCard>
          );
        })}
      </div>

      {aircraft.length === 0 && (
        <SectionCard>
          <div className="text-center py-12">
            <Plane className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2 text-card-foreground">No Aircraft Available</h3>
            <p className="text-muted-foreground">Check back later for available type ratings.</p>
          </div>
        </SectionCard>
      )}
    </DashboardLayout>
  );
}
