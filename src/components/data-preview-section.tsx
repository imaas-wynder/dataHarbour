// src/components/data-preview-section.tsx
"use client";

import { useState, useTransition, useEffect } from "react"; // Added useEffect
import { useRouter } from "next/navigation";
import { RefreshCw, Filter, X } from "lucide-react"; // Added Filter and X icons

import type { DataEntry, RelationshipEntry } from "@/services/database"; // Import RelationshipEntry
import { DataPreviewTable } from "@/components/data-preview-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Added Input
import { Label } from "@/components/ui/label"; // Added Label
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added Alert

interface DataPreviewSectionProps {
  initialData: DataEntry[];
  initialRelationships: RelationshipEntry[]; // Add initial relationships prop
  error: string | null;
}

export function DataPreviewSection({ initialData, initialRelationships, error: initialError }: DataPreviewSectionProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isFiltering, startFilteringTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [filterSourceId, setFilterSourceId] = useState<string>('');
  const [displayedData, setDisplayedData] = useState<DataEntry[]>(initialData); // State for data shown in table
  // Use initialRelationships directly, removing the need for separate state management here.
  const { toast } = useToast();

  // Update displayedData when initialData prop changes (e.g., after refresh or adding new data)
  // This useEffect ensures that if the parent component re-renders with new 'initialData',
  // the 'displayedData' state reflects these changes, especially after clearing filters.
  useEffect(() => {
    // Only reset displayedData if no filter is active
    if (!filterSourceId) {
      setDisplayedData(initialData);
    }
    // Clear general error if initialError is null (indicating successful fetch)
    if (initialError === null) {
        setError(null);
    } else {
        setError(initialError);
    }
   }, [initialData, initialError, filterSourceId]); // Depend on initialData, initialError, and filterSourceId


  const handleRefresh = () => {
    setError(null); // Clear previous errors on refresh attempt
    setFilterError(null); // Clear filter error
    setFilterSourceId(''); // Clear filter input
    // Trigger refresh - this will cause the parent page to re-fetch and pass new props
    startRefreshTransition(() => {
      try {
        router.refresh(); // Re-fetches data & relationships for the current route (page.tsx)
        toast({
          title: "Data Refreshed",
          description: "The data preview has been updated.",
        });
        // Note: displayedData will update via the useEffect when new initialData prop is received
      } catch (e) {
        console.error("Refresh failed:", e);
        const errorMessage = e instanceof Error ? e.message : "Failed to refresh data.";
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "Refresh Error",
          description: errorMessage,
        });
      }
    });
  };


  const handleApplyFilter = () => {
    if (!filterSourceId.trim()) {
      setFilterError("Please enter a Source Entry ID to filter by.");
      toast({ variant: "destructive", title: "Missing Input", description: "Source Entry ID cannot be empty." });
      return;
    }
    setError(null);
    setFilterError(null);
    startFilteringTransition(async () => {
      try {
        // Use the initialRelationships prop directly for filtering
        const sourceIdStr = filterSourceId.trim();
        const targetIds = new Set(
            initialRelationships // Use the prop directly
            .filter(rel => String(rel.source_entry_id) === sourceIdStr)
            .map(rel => String(rel.target_entry_id))
        );

        // Always filter based on the initialData prop to ensure consistency
        const sourceExists = initialData.some(entry => String(entry.id) === sourceIdStr);

        if (!sourceExists) {
            setFilterError(`Source entry ID ${sourceIdStr} not found in the current dataset.`);
            toast({
                variant: "destructive",
                title: "Filter Error",
                description: `Source entry ID ${sourceIdStr} does not exist.`,
            });
            setDisplayedData([]); // Show empty table
            return; // Stop further processing
        }


        if (targetIds.size > 0) {
             const filteredResults = initialData.filter(entry => targetIds.has(String(entry.id)));
             setDisplayedData(filteredResults);
             toast({
               title: "Filter Applied",
               description: `Showing ${filteredResults.length} entries related to source ID ${sourceIdStr}.`,
             });
        } else {
             // Source exists, but no relationships found
             setFilterError(`No relationships found originating from source ID ${sourceIdStr}.`);
             toast({
                variant: "default", // Use default variant for "not found"
                title: "Filter Applied",
                description: `No entries related to source ID ${sourceIdStr}.`,
             });
             setDisplayedData([]); // Show empty table
        }

      } catch (e) {
        console.error("Filtering failed:", e);
        const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred during filtering.";
        setFilterError(errorMessage);
        setDisplayedData([]);
        toast({
          variant: "destructive",
          title: "Filter Failed",
          description: errorMessage,
        });
      }
    });
  };

  const handleClearFilter = () => {
    setFilterSourceId('');
    setFilterError(null);
    setDisplayedData(initialData); // Reset to show all initial data from props
    toast({
      title: "Filter Cleared",
      description: "Showing all data entries.",
    });
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-start justify-between space-x-4">
           <div>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription className="mt-1">
                    View recently uploaded data. Optionally filter by relationships.
                 </CardDescription>
           </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing || isFiltering}
            aria-label="Refresh Data"
            className="flex-shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
         {/* Filter Controls */}
         <div className="flex flex-col sm:flex-row items-end gap-2 p-4 border rounded-md bg-muted/50">
           <div className="flex-grow w-full sm:w-auto space-y-1">
             <Label htmlFor="filter-source-id">Filter by Relationships (Source ID)</Label>
             <Input
               id="filter-source-id"
               placeholder="Enter Source Entry ID"
               value={filterSourceId}
               onChange={(e) => setFilterSourceId(e.target.value)}
               disabled={isFiltering || isRefreshing}
               className="bg-background"
             />
           </div>
           <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                <Button onClick={handleApplyFilter} disabled={isFiltering || isRefreshing || !filterSourceId.trim()} className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  {isFiltering ? "Filtering..." : "Filter"}
                </Button>
                 <Button variant="outline" onClick={handleClearFilter} disabled={isFiltering || isRefreshing} className="w-full sm:w-auto">
                  <X className="mr-2 h-4 w-4" />
                  Clear
                 </Button>
            </div>
         </div>

          {filterError && (
             <Alert variant="destructive">
               <AlertTitle>Filter Error</AlertTitle>
               <AlertDescription>{filterError}</AlertDescription>
             </Alert>
          )}

         {/* Data Table */}
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Loading Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
           // Pass displayedData and initialRelationships (from props) to the table
           // displayedData reflects filtering based on initialData
           // initialRelationships provides the source of truth for relationship lookups in the table
          <DataPreviewTable data={displayedData} relationships={initialRelationships} />
        )}
        {(isRefreshing || isFiltering) && <p className="text-muted-foreground text-sm mt-2">{isRefreshing ? 'Refreshing data...' : 'Applying filter...'}</p>}
      </CardContent>
    </Card>
  );
}

