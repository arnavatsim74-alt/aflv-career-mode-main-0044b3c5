import { useState } from 'react';
import { Plane, Clock, Award, AlertTriangle, Search, User, Radio, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionCard } from '@/components/ui/section-card';
import { Badge } from '@/components/ui/badge';
import { useInfiniteFlightUserStats, IFUserStats } from '@/hooks/useInfiniteFlightUserStats';

const gradeNames: Record<number, string> = {
  1: 'Grade 1',
  2: 'Grade 2',
  3: 'Grade 3',
  4: 'Grade 4',
  5: 'Grade 5',
};

const gradeColors: Record<number, string> = {
  1: 'bg-muted text-muted-foreground',
  2: 'bg-green-500/20 text-green-400',
  3: 'bg-blue-500/20 text-blue-400',
  4: 'bg-purple-500/20 text-purple-400',
  5: 'bg-amber-500/20 text-amber-400',
};

const atcRankNames: Record<number, string> = {
  0: 'Observer',
  1: 'Trainee',
  2: 'Apprentice',
  3: 'Specialist',
  4: 'Officer',
  5: 'Supervisor',
  6: 'Recruiter',
  7: 'Manager',
};

function formatFlightTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours.toLocaleString()}h ${minutes}m`;
}

function UserStatsDisplay({ stats }: { stats: IFUserStats }) {
  const totalViolations = stats.violationCountByLevel.level1 + 
                          stats.violationCountByLevel.level2 + 
                          stats.violationCountByLevel.level3;

  return (
    <div className="space-y-6">
      {/* Grade Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">IF Grade</p>
            <p className="text-xl font-bold">{gradeNames[stats.grade] || `Grade ${stats.grade}`}</p>
          </div>
        </div>
        <Badge className={gradeColors[stats.grade] || 'bg-muted'}>
          {gradeNames[stats.grade] || `Grade ${stats.grade}`}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <Clock className="h-5 w-5 mx-auto mb-2 text-primary" />
          <p className="text-lg font-bold">{formatFlightTime(stats.flightTime)}</p>
          <p className="text-xs text-muted-foreground">Flight Time</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <Plane className="h-5 w-5 mx-auto mb-2 text-primary" />
          <p className="text-lg font-bold">{stats.onlineFlights.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Online Flights</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <ChevronRight className="h-5 w-5 mx-auto mb-2 text-primary rotate-90" />
          <p className="text-lg font-bold">{stats.landingCount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Landings</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <Award className="h-5 w-5 mx-auto mb-2 text-primary" />
          <p className="text-lg font-bold">{stats.xp.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">XP</p>
        </div>
      </div>

      {/* Violations Section */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h4 className="font-semibold">Violations</h4>
          <Badge variant="outline">{totalViolations} Total</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{stats.violationCountByLevel.level1}</p>
            <p className="text-xs text-muted-foreground">Level 1</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.violationCountByLevel.level2}</p>
            <p className="text-xs text-muted-foreground">Level 2</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{stats.violationCountByLevel.level3}</p>
            <p className="text-xs text-muted-foreground">Level 3</p>
          </div>
        </div>
      </div>

      {/* ATC Stats */}
      {(stats.atcOperations > 0 || stats.atcRank !== null) && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="h-4 w-4 text-primary" />
            <h4 className="font-semibold">ATC Statistics</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Operations</p>
              <p className="text-xl font-bold">{stats.atcOperations.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rank</p>
              <p className="text-xl font-bold">
                {stats.atcRank !== null ? atcRankNames[stats.atcRank] || `Rank ${stats.atcRank}` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Virtual Organization */}
      {stats.virtualOrganization && (
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Virtual Organization:</span>
          <span className="font-medium">{stats.virtualOrganization}</span>
        </div>
      )}

      {/* User ID */}
      <div className="text-xs text-muted-foreground border-t border-border pt-3">
        <p>IF User ID: <span className="font-mono">{stats.userId}</span></p>
        <p>Hash: <span className="font-mono">{stats.hash}</span></p>
      </div>
    </div>
  );
}

export function InfiniteFlightProfile() {
  const [searchType, setSearchType] = useState<'userId' | 'userHash' | 'discordId'>('userId');
  const [searchValue, setSearchValue] = useState('');
  const { loading, error, userStats, fetchByUserId, fetchByUserHash, fetchByDiscordId, clearStats } = useInfiniteFlightUserStats();

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    
    switch (searchType) {
      case 'userId':
        await fetchByUserId(searchValue.trim());
        break;
      case 'userHash':
        await fetchByUserHash(searchValue.trim());
        break;
      case 'discordId':
        await fetchByDiscordId(searchValue.trim());
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <SectionCard 
      title="Infinite Flight Profile" 
      icon={<Plane className="h-5 w-5 text-primary" />}
    >
      <div className="space-y-4">
        {/* Search Section */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={searchType === 'userId' ? 'default' : 'outline'}
              onClick={() => setSearchType('userId')}
            >
              User ID
            </Button>
            <Button
              size="sm"
              variant={searchType === 'userHash' ? 'default' : 'outline'}
              onClick={() => setSearchType('userHash')}
            >
              User Hash
            </Button>
            <Button
              size="sm"
              variant={searchType === 'discordId' ? 'default' : 'outline'}
              onClick={() => setSearchType('discordId')}
            >
              Discord ID
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="if-search" className="sr-only">
                Search by {searchType === 'userId' ? 'User ID' : searchType === 'userHash' ? 'User Hash' : 'Discord ID'}
              </Label>
              <Input
                id="if-search"
                placeholder={
                  searchType === 'userId' 
                    ? 'Enter IF User ID (UUID format)' 
                    : searchType === 'userHash'
                    ? 'Enter IF User Hash'
                    : 'Enter Discord User ID'
                }
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !searchValue.trim()}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Stats Display */}
        {userStats && <UserStatsDisplay stats={userStats} />}

        {/* Clear Button */}
        {userStats && (
          <Button variant="outline" size="sm" onClick={clearStats}>
            Clear Results
          </Button>
        )}

        {/* Empty State */}
        {!userStats && !loading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Plane className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Search for an Infinite Flight user to view their stats</p>
            <p className="text-xs mt-1">You can search by User ID, User Hash, or Discord ID</p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
