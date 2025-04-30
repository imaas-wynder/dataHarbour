// src/components/data-detail-view.tsx
"use client";

import { useState, useTransition } from 'react';
import type { DataEntry } from '@/services/database';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cleanDataAction, updateDataAction } from '@/actions/data-actions';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

interface DataDetailViewProps {
  initialData: DataEntry;
  entryId: string | number;
}

export function DataDetailView({ initialData, entryId }: DataDetailViewProps) {
  const [currentData, setCurrentData] = useState<DataEntry>(initialData);
  const [cleanedDataSuggestion, setCleanedDataSuggestion] = useState<DataEntry | null>(null);
  const [isCleaning, startCleaningTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCleanData = () => {
    setError(null);
    setCleanedDataSuggestion(null); // Clear previous suggestion
    startCleaningTransition(async () => {
      try {
        const result = await cleanDataAction(entryId);
        if (result.success && result.data) {
          setCleanedDataSuggestion(result.data as DataEntry);
          toast({
            title: 'Cleaning Suggestion Ready',
            description: 'AI has generated a cleaned version of the data.',
          });
        } else {
          setError(result.error || 'Failed to get cleaning suggestions.');
          toast({
            variant: 'destructive',
            title: 'Cleaning Error',
            description: result.error || 'Could not generate cleaning suggestions.',
          });
        }
      } catch (e) {
        console.error('Error calling cleanDataAction:', e);
        const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
        setError(message);
        toast({
          variant: 'destructive',
          title: 'Cleaning Failed',
          description: message,
        });
      }
    });
  };

  const handleApplySuggestion = () => {
      if (!cleanedDataSuggestion) return;
      setError(null);
      startSavingTransition(async () => {
        try {
            const result = await updateDataAction(entryId, cleanedDataSuggestion);
             if (result.success) {
                setCurrentData(cleanedDataSuggestion); // Update local state to reflect saved changes
                setCleanedDataSuggestion(null); // Clear the suggestion box
                toast({
                    title: 'Success',
                    description: result.message || 'Data updated successfully.',
                });
            } else {
                 setError(result.error || 'Failed to update data.');
                 toast({
                    variant: 'destructive',
                    title: 'Update Error',
                    description: result.error || 'Could not save the cleaned data.',
                 });
            }
        } catch (e) {
             console.error('Error calling updateDataAction:', e);
             const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
             setError(message);
             toast({
               variant: 'destructive',
               title: 'Update Failed',
               description: message,
             });
        }
      });
  };

  const handleSuggestionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      try {
          const updatedSuggestion = JSON.parse(event.target.value);
          setCleanedDataSuggestion(updatedSuggestion);
      } catch (e) {
          // Handle JSON parse error if needed, maybe show a small inline error
          console.warn("Invalid JSON in suggestion textarea");
      }
  };

  return (
    <div className="space-y-4">
      {error && (
         <Alert variant="destructive">
           <AlertTitle>Error</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}

        <Card>
            <CardHeader>
                <CardTitle>Current Data</CardTitle>
                <CardDescription>The data currently stored in the database.</CardDescription>
            </CardHeader>
            <CardContent>
                 <pre className="p-4 bg-muted rounded-md overflow-auto text-sm">
                   {JSON.stringify(currentData, null, 2)}
                 </pre>
            </CardContent>
            <CardFooter>
                 <Button onClick={handleCleanData} disabled={isCleaning}>
                   {isCleaning ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   ) : (
                     <Sparkles className="mr-2 h-4 w-4" />
                   )}
                   {isCleaning ? 'Cleaning...' : 'Clean Data with AI'}
                 </Button>
            </CardFooter>
        </Card>


      {isCleaning && (
         <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="ml-2 text-muted-foreground">Generating cleaning suggestions...</p>
         </div>
      )}

      {cleanedDataSuggestion && (
        <Card>
            <CardHeader>
                <CardTitle>AI Cleaning Suggestion</CardTitle>
                <CardDescription>Review and edit the suggestion below. Click Apply to save.</CardDescription>
            </CardHeader>
          <CardContent className="space-y-2">
             <Label htmlFor="suggestion-textarea">Suggested Cleaned Data (JSON)</Label>
             <Textarea
                id="suggestion-textarea"
               value={JSON.stringify(cleanedDataSuggestion, null, 2)}
               onChange={handleSuggestionChange}
               className="min-h-[200px] font-mono text-sm"
               disabled={isSaving}
             />
          </CardContent>
           <CardFooter className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCleanedDataSuggestion(null)} disabled={isSaving}>
                    Discard
                </Button>
                 <Button onClick={handleApplySuggestion} disabled={isSaving}>
                   {isSaving ? (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   ) : (
                     <Save className="mr-2 h-4 w-4" />
                   )}
                   {isSaving ? 'Saving...' : 'Apply Suggestion'}
                 </Button>
           </CardFooter>
        </Card>
      )}
    </div>
  );
}
