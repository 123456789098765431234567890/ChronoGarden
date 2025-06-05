
"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, UserCircle, Zap, Sprout, Recycle, Loader2 } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import type { LeaderboardEntry } from '@/config/gameConfig';

const LEADERBOARD_DISPLAY_LIMIT = 10;

export default function LeaderboardPanel() {
  const { state: localGameState } = useGame();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [playerData, setPlayerData] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const leaderboardRef = ref(database, 'leaderboard');
    // Query to get top N players by totalCropsHarvested
    // Firebase RTDB sorts in ascending order, so we use limitToLast and then reverse client-side for descending.
    // Or, store a negative score if you always want to sort by a score descending.
    // For simplicity, fetching all and sorting client-side if data set is small.
    // For larger datasets, use Firebase queries more effectively or Cloud Functions.
    const leaderboardQuery = query(leaderboardRef, orderByChild('totalCropsHarvested'));


    const unsubscribe = onValue(leaderboardQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allPlayersArray: LeaderboardEntry[] = Object.entries(data)
          .map(([id, entry]) => ({
            id,
            ...(entry as Omit<LeaderboardEntry, 'id'>)
          }))
          .sort((a, b) => (b.totalCropsHarvested || 0) - (a.totalCropsHarvested || 0)); // Sort descending

        setLeaderboardData(allPlayersArray.slice(0, LEADERBOARD_DISPLAY_LIMIT));
        
        // Find current player's rank and data
        const currentPlayerIndex = allPlayersArray.findIndex(p => p.name === localGameState.playerName);
        if (currentPlayerIndex !== -1) {
          setPlayerRank(currentPlayerIndex + 1);
          setPlayerData(allPlayersArray[currentPlayerIndex]);
        } else {
          setPlayerRank(null); // Player not on leaderboard or name doesn't match
          setPlayerData(null);
        }
        setError(null);
      } else {
        setLeaderboardData([]);
        setPlayerRank(null);
        setPlayerData(null);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching leaderboard data:", err);
      setError("Failed to load leaderboard data. Please check your connection or try again later.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [localGameState.playerName]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-primary" />
          Temporal Leaderboard
        </CardTitle>
        <CardDescription>
          See how you stack up against other Time Gardeners! Data updates in real-time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading leaderboard...</p>
          </div>
        )}
        {error && <p className="text-destructive text-center py-4">{error}</p>}
        
        {!isLoading && !error && (
          <>
            <div className="mb-6 p-4 border rounded-lg bg-muted/30">
                <h3 className="font-semibold text-lg mb-2 flex items-center"><UserCircle className="w-5 h-5 mr-2 text-accent"/>Your Current Stats</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <p><Sprout className="w-4 h-4 inline mr-1 text-green-500" />Crops: <span className="font-bold">{localGameState.totalCropsHarvestedAllTime || 0}</span></p>
                    <p><Recycle className="w-4 h-4 inline mr-1 text-blue-500" />Prestige: <span className="font-bold">{localGameState.prestigeCount}</span></p>
                    <p><Zap className="w-4 h-4 inline mr-1 text-yellow-500" />Chrono-Energy: <span className="font-bold">{Math.floor(localGameState.totalChronoEnergyEarned || 0)}</span></p>
                </div>
                {playerRank && playerData && (
                    <p className="mt-2 text-sm font-medium">Your Rank: <span className="text-primary font-bold">#{playerRank}</span></p>
                )}
                 {localGameState.playerName === "Time Gardener" && <p className="text-xs text-muted-foreground mt-1">Set your Player Name in the Profile tab to appear on the leaderboard!</p>}
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
                {leaderboardData.map((player, index) => (
                  <TableRow key={player.id} className={player.name === localGameState.playerName ? "bg-primary/10" : ""}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell className="text-right">{(player.totalCropsHarvested || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{player.prestigeCount || 0}</TableCell>
                    <TableCell className="text-right">{(player.totalChronoEnergyEarned || 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {leaderboardData.length === 0 && <p className="text-center text-muted-foreground mt-4">Leaderboard is currently empty or data is unavailable.</p>}
          </>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Leaderboard updates in real-time. Ensure you have set a unique Player Name in the Profile tab.
      </CardFooter>
    </Card>
  );
}
