import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Plane, Mail, Lock, User, Tag, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Base {
  id: string;
  icao_code: string;
  name: string;
  multiplier: number;
}

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bases, setBases] = useState<Base[]>([]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupCallsign, setSignupCallsign] = useState('');
  const [signupBase, setSignupBase] = useState('');
  const [signupSimbriefPid, setSignupSimbriefPid] = useState('');
  const [signupIfcUsername, setSignupIfcUsername] = useState('');
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    fetchBases();
  }, []);

  const fetchBases = async () => {
    const { data } = await supabase
      .from('bases')
      .select('id, icao_code, name, multiplier')
      .order('multiplier', { ascending: false });
    
    if (data) {
      setBases(data);
      if (data.length > 0 && !signupBase) {
        setSignupBase(data[0].icao_code);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Plane className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
    }
    
    setIsSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!signupCallsign || signupCallsign.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Invalid Callsign',
        description: 'Callsign must be at least 3 characters.',
      });
      setIsSubmitting(false);
      return;
    }

    if (!signupBase) {
      toast({
        variant: 'destructive',
        title: 'Base Required',
        description: 'Please select your home base.',
      });
      setIsSubmitting(false);
      return;
    }

    const { error, user: newUser } = await signUp(signupEmail, signupPassword, signupName, signupCallsign, signupBase, signupSimbriefPid, signupIfcUsername);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: error.message,
      });
    } else if (newUser) {
      toast({
        title: 'Application Submitted!',
        description: 'Your pilot application is pending admin approval.',
      });
    }
    
    setIsSubmitting(false);
  };

  const selectedBase = bases.find(b => b.icao_code === signupBase);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center mb-8">
        <div className="w-16 h-16 mb-4">
          <img src="/logo.png" alt="AFLV Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Aeroflot Virtual Operations</h1>
        <p className="text-sm text-muted-foreground">AFLV Operations System</p>
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl">
        {!showSignup ? (
          <>
            {/* Login Form */}
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Pilot Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-card-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="pilot@aeroflot.ru"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-card-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowSignup(true)}
                className="text-sm text-primary hover:underline"
              >
                New pilot? Create an account
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Signup Form */}
            <h2 className="text-lg font-semibold text-card-foreground mb-4">Create Pilot Account</h2>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-card-foreground">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Иван Петров"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-callsign" className="text-card-foreground">Callsign *</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-callsign"
                    type="text"
                    placeholder="e.g., AFLV001"
                    value={signupCallsign}
                    onChange={(e) => setSignupCallsign(e.target.value.toUpperCase())}
                    className="pl-10 uppercase"
                    required
                    minLength={3}
                    maxLength={10}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Your unique pilot identifier</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-base" className="text-card-foreground">Home Base *</Label>
                <Select value={signupBase} onValueChange={setSignupBase}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select your home base" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {bases.map((base) => (
                      <SelectItem key={base.id} value={base.icao_code}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>{base.icao_code} - {base.name}</span>
                          <span className="text-xs text-primary font-medium">{base.multiplier}x</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBase && (
                  <p className="text-xs text-primary">
                    Earnings multiplier: {selectedBase.multiplier}x
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-card-foreground">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="pilot@aeroflot.ru"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-card-foreground">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>

              {/* Optional Fields */}
              <div className="border-t border-border pt-4 mt-4">
                <p className="text-xs text-muted-foreground mb-3">Optional - Can be added later</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="simbrief-pid" className="text-card-foreground text-xs">SimBrief PID</Label>
                    <Input
                      id="simbrief-pid"
                      type="text"
                      placeholder="e.g., 123456"
                      value={signupSimbriefPid}
                      onChange={(e) => setSignupSimbriefPid(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ifc-username" className="text-card-foreground text-xs">IFC Username</Label>
                    <Input
                      id="ifc-username"
                      type="text"
                      placeholder="@username"
                      value={signupIfcUsername}
                      onChange={(e) => setSignupIfcUsername(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating account...' : 'Create Pilot Account'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowSignup(false)}
                className="text-sm text-primary hover:underline"
              >
                Already have an account? Sign in
              </button>
            </div>
          </>
        )}
      </div>

      <p className="relative z-10 mt-6 text-sm text-muted-foreground text-center">
        Aeroflot Virtual © 2026
      </p>
    </div>
  );
}
