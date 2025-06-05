
"use client";

import React, { useState, useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ALL_CROPS_MAP, ALL_GAME_RESOURCES_MAP, TRADABLE_RESOURCES_FOR_MARKET, getMarketItemDisplayName, type MarketListing as MarketListingType, Crop } from '@/config/gameConfig';
import { ShoppingCart, Coins as CoinsIcon, Sprout as SproutIcon, Package as PackageIcon, Tag, Loader2, AlertCircle, PlusCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { database } from '@/lib/firebase';
import { ref, onValue, push, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';

const MAX_LISTINGS_DISPLAY = 20;

export default function MarketPanel() {
  const { state, dispatch } = useGame();
  const { toast } = useToast();

  const [marketListings, setMarketListings] = useState<MarketListingType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [itemTypeToList, setItemTypeToList] = useState<'seed' | 'resource'>('seed');
  const [selectedItemToList, setSelectedItemToList] = useState<string>('');
  const [quantityToList, setQuantityToList] = useState<number>(1);
  const [priceToList, setPriceToList] = useState<number>(10);
  const [isSubmittingListing, setIsSubmittingListing] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const marketRef = query(ref(database, 'marketListings'), orderByChild('timestamp'), limitToLast(MAX_LISTINGS_DISPLAY * 2)); // Fetch more to sort client-side if needed

    const unsubscribe = onValue(marketRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const listingsArray: MarketListingType[] = Object.entries(data)
          .map(([id, entry]) => ({
            id,
            ...(entry as Omit<MarketListingType, 'id'>)
          }))
          .sort((a, b) => b.timestamp - a.timestamp) // Sort newest first
          .slice(0, MAX_LISTINGS_DISPLAY); 
        setMarketListings(listingsArray);
        setError(null);
      } else {
        setMarketListings([]);
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching market data:", err);
      setError("Failed to load market data. Please check your connection or try again later.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const availableRareSeedsForListing = state.rareSeeds
    .map(seedId => ALL_CROPS_MAP[seedId])
    .filter(crop => crop && crop.isTradableSeed);

  const availableResourcesForListing = TRADABLE_RESOURCES_FOR_MARKET
    .filter(res => (state.resources[res.id] || 0) > 0);


  const handleCreateListing = async () => {
    dispatch({ type: 'USER_INTERACTION' });
    if (!selectedItemToList || quantityToList <= 0 || priceToList <= 0) {
      toast({ title: "Invalid Listing", description: "Please select an item and enter valid quantity/price.", variant: "destructive" });
      return;
    }
    if (state.playerName === "Time Gardener") {
        toast({ title: "Set Player Name", description: "Please set your Player Name in the Profile tab before listing items.", variant: "default" });
        return;
    }

    setIsSubmittingListing(true);

    let hasItem = false;
    let itemNameDisplay = "";

    if (itemTypeToList === 'seed') {
      const crop = ALL_CROPS_MAP[selectedItemToList];
      if (crop && state.rareSeeds.includes(selectedItemToList)) {
        hasItem = true; // For rare seeds, quantity is effectively 1 per rare seed entry
        itemNameDisplay = getMarketItemDisplayName('seed', selectedItemToList);
      }
    } else if (itemTypeToList === 'resource') {
      const resource = ALL_GAME_RESOURCES_MAP[selectedItemToList];
      if (resource && (state.resources[selectedItemToList] || 0) >= quantityToList) {
        hasItem = true;
        itemNameDisplay = getMarketItemDisplayName('resource', selectedItemToList);
      }
    }

    if (!hasItem) {
      toast({ title: "Not Enough Items", description: "You don't have enough of the selected item to list.", variant: "destructive" });
      setIsSubmittingListing(false);
      return;
    }

    const newListing: Omit<MarketListingType, 'id'> = {
      itemName: itemNameDisplay,
      itemType: itemTypeToList,
      itemId: selectedItemToList,
      quantity: itemTypeToList === 'seed' ? 1 : quantityToList, // Seeds are listed individually
      price: priceToList,
      sellerName: state.playerName,
      timestamp: serverTimestamp() as unknown as number,
    };

    try {
      await push(ref(database, 'marketListings'), newListing);
      // Deduct item from local state
      dispatch({ type: 'LIST_ITEM_ON_MARKET', payload: { itemType: itemTypeToList, itemId: selectedItemToList, quantity: itemTypeToList === 'seed' ? 1 : quantityToList } });
      toast({ title: "Listing Created!", description: `${itemNameDisplay} listed on the market.` });
      // Reset form
      setSelectedItemToList('');
      setQuantityToList(1);
      setPriceToList(10);
    } catch (e) {
      console.error("Error creating listing:", e);
      toast({ title: "Listing Failed", description: "Could not create market listing. See console.", variant: "destructive" });
    } finally {
      setIsSubmittingListing(false);
    }
  };
  
  useEffect(() => {
    // Reset selected item when type changes
    setSelectedItemToList('');
    setQuantityToList(1);
  }, [itemTypeToList]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center">
          <ShoppingCart className="w-6 h-6 mr-2 text-primary" />
          Temporal Market
        </CardTitle>
        <CardDescription>
          Trade goods with other Time Gardeners! Listings are live from the Chrono-Network. ChronoCoin Balance: {Math.floor(state.resources.ChronoCoins || 0)}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        {/* Create Listing Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
          <h3 className="font-headline text-lg flex items-center"><PlusCircle className="w-5 h-5 mr-2 text-accent" />Create New Listing</h3>
          
          <div className="space-y-1">
            <Label htmlFor="itemTypeToList">Item Type</Label>
            <Select value={itemTypeToList} onValueChange={(value) => setItemTypeToList(value as 'seed' | 'resource')}>
              <SelectTrigger id="itemTypeToList"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="seed">Rare Seed</SelectItem>
                <SelectItem value="resource">Resource</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {itemTypeToList === 'seed' && (
            <div className="space-y-1">
              <Label htmlFor="seedToList">Select Seed (You own: {availableRareSeedsForListing.length})</Label>
              <Select value={selectedItemToList} onValueChange={setSelectedItemToList} disabled={availableRareSeedsForListing.length === 0}>
                <SelectTrigger id="seedToList">
                  <SelectValue placeholder={availableRareSeedsForListing.length === 0 ? "No rare seeds to list" : "Select a rare seed"} />
                </SelectTrigger>
                <SelectContent>
                  {availableRareSeedsForListing.map(crop => (
                    <SelectItem key={crop.id} value={crop.id}>{crop.name} Seed (Rare)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {itemTypeToList === 'resource' && (
            <div className="space-y-1">
              <Label htmlFor="resourceToList">Select Resource</Label>
              <Select value={selectedItemToList} onValueChange={setSelectedItemToList} disabled={availableResourcesForListing.length === 0}>
                <SelectTrigger id="resourceToList">
                  <SelectValue placeholder={availableResourcesForListing.length === 0 ? "No resources to list" : "Select a resource"} />
                </SelectTrigger>
                <SelectContent>
                  {availableResourcesForListing.map(res => (
                    <SelectItem key={res.id} value={res.id}>{res.name} (Owned: {Math.floor(state.resources[res.id] || 0)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {itemTypeToList === 'resource' && (
            <div className="space-y-1">
                <Label htmlFor="quantityToList">Quantity</Label>
                <Input 
                    id="quantityToList" 
                    type="number" 
                    value={quantityToList} 
                    onChange={(e) => setQuantityToList(Math.max(1, parseInt(e.target.value)))} 
                    min="1"
                    disabled={!selectedItemToList}
                />
            </div>
           )}


          <div className="space-y-1">
            <Label htmlFor="priceToList">Price (ChronoCoins)</Label>
            <Input 
                id="priceToList" 
                type="number" 
                value={priceToList} 
                onChange={(e) => setPriceToList(Math.max(1, parseInt(e.target.value)))} 
                min="1"
                disabled={!selectedItemToList} 
            />
          </div>
          <Button onClick={handleCreateListing} disabled={isSubmittingListing || !selectedItemToList || state.playerName === "Time Gardener"} className="w-full">
            {isSubmittingListing ? <Loader2 className="animate-spin mr-2" /> : <Tag className="mr-2" />}
            {state.playerName === "Time Gardener" ? "Set Name to List" : "Create Listing"}
          </Button>
        </div>

        {/* View Listings Section */}
        <div className="space-y-4">
          <h3 className="font-headline text-lg">Current Market Listings</h3>
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="ml-2">Loading market...</p>
            </div>
          )}
          {error && <p className="text-destructive text-sm flex items-center"><AlertCircle className="w-4 h-4 mr-1" />{error}</p>}
          {!isLoading && !error && marketListings.length === 0 && <p className="text-muted-foreground text-sm">No items currently listed on the market.</p>}
          
          {!isLoading && !error && marketListings.length > 0 && (
            <ScrollArea className="h-[400px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price (CC)</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marketListings.map((listing) => {
                    const ItemIcon = listing.itemType === 'seed' ? (ALL_CROPS_MAP[listing.itemId]?.icon || SproutIcon) : (ALL_GAME_RESOURCES_MAP[listing.itemId]?.icon || PackageIcon);
                    return (
                        <TableRow key={listing.id}>
                        <TableCell className="font-medium">
                            <div className="flex items-center">
                                <ItemIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                                {listing.itemName}
                            </div>
                        </TableCell>
                        <TableCell className="text-center">{listing.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{listing.price}</TableCell>
                        <TableCell className="text-xs truncate max-w-[100px]" title={listing.sellerName}>{listing.sellerName}</TableCell>
                        <TableCell className="text-center">
                            <Button size="sm" variant="outline" disabled> {/* Buy functionality is complex and needs secure implementation */}
                                <CoinsIcon className="w-3 h-3 mr-1" /> Buy
                            </Button>
                        </TableCell>
                        </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Market data is live. Listing items will deduct them from your inventory. Buying functionality is currently for display and will be enabled in a future update.
      </CardFooter>
    </Card>
  );
}
