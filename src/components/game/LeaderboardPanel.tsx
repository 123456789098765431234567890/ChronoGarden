
"use client";

import React from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, UserCircle, Zap, Sprout, Recycle } from 'lucide-react';

// Mock data for leaderboard
const MOCK_LEADERBOARD_DATA = [
  { rank: 1, name: "TimeLordSupreme", crops: 10580, prestige: 15, chronoEnergy: 500000 },
  { rank: 2, name: "GardenGalactica", crops: 9800, prestige: 12, chronoEnergy: 450000 },
  { rank: 3, name: "ChronoFarmerX", crops: 9500, prestige: 10, chronoEnergy: 420000 },
  { rank: 4, name: "SeedSavvy", crops: 8800, prestige: 9, chronoEnergy: 380000 },
  { rank: 5, name: "FloraFuturist", crops: 8200, prestige: 8, chronoEnergy: 350000 },
  { rank: 6, name: "MossMaster", crops: 7500, prestige: 7, chronoEnergy: 300000 },
  { rank: 7, name: "DinoDigger", crops: 7000, prestige: 6, chronoEnergy: 280000 },
  { rank: 8, name: "QuantumQuasar", crops: 6500, prestige: 5, chronoEnergy: 250000 },
  { rank: 9, name: "PresentPro", crops: 6000, prestige: 4, chronoEnergy: 220000 },
  { rank: 10, name: "BotanyBotPrime", crops: 5500, prestige: 3, chronoEnergy: 200000 },
];


export default function LeaderboardPanel() {
  const { state } = useGame();

  // Simulate player's rank (could be more sophisticated with real data)
  const yourRank = MOCK_LEADERBOARD_DATA.length + 1; // Default to last if not on list

  const displayData = [...MOCK_LEADERBOARD_DATA];
  // In a real scenario, you might fetch this or integrate player's actual data
  // For now, we'll just show player's stats separately if not in top 10.

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-primary" />
          Temporal Leaderboard (Mock)
        </CardTitle>
        <CardDescription>
          See how you stack up against other Time Gardeners! (This is a mock leaderboard for demonstration).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 border rounded-lg bg-muted/30">
            <h3 className="font-semibold text-lg mb-2 flex items-center"><UserCircle className="w-5 h-5 mr-2 text-accent"/>Your Current Stats</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <p><Sprout className="w-4 h-4 inline mr-1 text-green-500" />Crops Harvested: <span className="font-bold">{state.totalCropsHarvestedAllTime || 0}</span></p>
                <p><Recycle className="w-4 h-4 inline mr-1 text-blue-500" />Prestige Count: <span className="font-bold">{state.prestigeCount}</span></p>
                <p><Zap className="w-4 h-4 inline mr-1 text-yellow-500" />Chrono-Energy Earned: <span className="font-bold">{Math.floor(state.totalChronoEnergyEarned || 0)}</span></p>
            </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Crops</TableHead>
              <TableHead className="text-right">Prestige</TableHead>
              <TableHead className="text-right">Chrono-Energy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((player) => (
              <TableRow key={player.rank} className={player.name === state.playerName ? "bg-primary/10" : ""}>
                <TableCell className="font-medium">{player.rank}</TableCell>
                <TableCell>{player.name}</TableCell>
                <TableCell className="text-right">{player.crops.toLocaleString()}</TableCell>
                <TableCell className="text-right">{player.prestige}</TableCell>
                <TableCell className="text-right">{player.chronoEnergy.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
         {displayData.length === 0 && <p className="text-center text-muted-foreground mt-4">Leaderboard data is currently unavailable.</p>}

      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Leaderboard data is for illustrative purposes. In a live game, this would be updated in real-time.
      </CardFooter>
    </Card>
  );
}
