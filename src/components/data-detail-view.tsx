// src/components/data-detail-view.tsx
"use client";

import { useState, useTransition, useEffect } from 'react';
import type { DataEntry, RelationshipEntry } from '@/services/database'; // Import RelationshipEntry
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cleanDataAction, updateDataAction, addRelationshipAction, getRelationshipsAction } from '@/actions/data-actions'; // Import relationship actions
import { Loader2, Save, Sparkles, Edit, XCircle, LinkIcon, Plus, Trash2 } from 'lucide-react'; // Added LinkIcon, Plus, Trash2
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from '@/components/ui/input'; // Added Input
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; // Added Table components
import Link from 'next/link'; // Added Link


interface DataDetailViewProps {
  initialData: DataEntry;
  entryId: string | number;
}

export function DataDetailView({ initialData, entryId }: DataDetailViewProps) {
  const [currentData, setCurrentData] = useState<DataEntry>(initialData);
  const [cleanedDataSuggestion, setCleanedDataSuggestion] = useState<DataEntry | null>(null);
  const [isCleaning, startCleaningTransition] = useTransition();
  const [isSaving, startSavingTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false); // State for manual edit mode
  const [editedJsonString, setEditedJsonString] = useState(''); // State for the textarea content during edit
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null); // Specific error for manual edit validation
  const { toast } = useToast();

  // --- Relationship State ---
  const [relationships, setRelationships] = useState<RelationshipEntry[]>([]);
  const [isLoadingRelationships, startLoadingRelationshipsTransition] = useTransition();
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [targetEntryId, setTargetEntryId] = useState<string>('');
  const [isAddingRelationship, startAddingRelationshipTransition] = useTransition();
  // --- End Relationship State ---

  // --- Fetch Relationships ---
  useEffect(() => {
    setRelationshipError(null);
    startLoadingRelationshipsTransition(async () => {
      try {
        const result = await getRelationshipsAction(entryId);
        if (result.success) {
          setRelationships(result.data as RelationshipEntry[]);
        } else {
          setRelationshipError(result.error || 'Failed to load relationships.');
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'An unexpected error occurred while fetching relationships.';
        setRelationshipError(message);
      }
    });
  }, [entryId]); // Refetch when entryId changes
  // --- End Fetch Relationships ---


  const handleCleanData = () => {
    setError(null);
    setEditError(null);
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
      setEditError(null);
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

  // --- Manual Edit Handlers ---
  const handleEditClick = () => {
    setIsEditing(true);
    setEditedJsonString(JSON.stringify(currentData, null, 2));
    setEditError(null); // Clear previous edit errors
    setError(null); // Clear general errors
    setCleanedDataSuggestion(null); // Clear AI suggestion when starting manual edit
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedJsonString('');
    setEditError(null);
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedJsonString(event.target.value);
    setEditError(null); // Clear error on change
  };

  const handleSaveChanges = () => {
    setError(null);
    setEditError(null);
    let parsedData: DataEntry;

    try {
        parsedData = JSON.parse(editedJsonString);
        if (typeof parsedData !== 'object' || parsedData === null) {
            throw new Error("Invalid data format. Must be a JSON object.");
        }
    } catch (e) {
        const message = e instanceof Error ? e.message : "Invalid JSON format.";
        setEditError(message);
        toast({
            variant: 'destructive',
            title: 'Invalid Data',
            description: message,
        });
        return;
    }

    startSavingTransition(async () => {
        try {
            // Ensure ID is not overwritten if present in edited data
            const dataToSave = { ...parsedData };
            // delete dataToSave.id; // Let the backend handle ID consistency

            const result = await updateDataAction(entryId, dataToSave);
            if (result.success) {
                setCurrentData({ ...dataToSave, id: currentData.id }); // Update local state with saved data, keeping original ID
                setIsEditing(false); // Exit edit mode
                toast({
                    title: 'Success',
                    description: result.message || 'Data updated successfully.',
                });
            } else {
                setError(result.error || 'Failed to update data.');
                toast({
                    variant: 'destructive',
                    title: 'Update Error',
                    description: result.error || 'Could not save the changes.',
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
  // --- End Manual Edit Handlers ---

   // --- Relationship Handlers ---
   const handleAddRelationship = () => {
        if (!targetEntryId.trim()) {
            setRelationshipError('Target Entry ID cannot be empty.');
            toast({ variant: 'destructive', title: 'Missing Input', description: 'Please enter a Target Entry ID.' });
            return;
        }
        setRelationshipError(null);
        startAddingRelationshipTransition(async () => {
             try {
                 const result = await addRelationshipAction(entryId, targetEntryId.trim());
                 if (result.success) {
                     setRelationships(prev => [...prev, result.data as RelationshipEntry]);
                     setTargetEntryId(''); // Clear input on success
                     toast({
                         title: 'Success',
                         description: result.message || 'Relationship added successfully.',
                     });
                 } else {
                     setRelationshipError(result.error || 'Failed to add relationship.');
                     toast({
                         variant: 'destructive',
                         title: 'Relationship Error',
                         description: result.error || 'Could not add the relationship.',
                     });
                 }
             } catch (e) {
                  console.error('Error calling addRelationshipAction:', e);
                  const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
                  setRelationshipError(message);
                  toast({
                     variant: 'destructive',
                     title: 'Relationship Failed',
                     description: message,
                  });
             }
        });
   };

   // Placeholder for delete relationship functionality if needed later
   const handleDeleteRelationship = (relationshipId: number | string) => {
        console.warn(`Delete relationship functionality not implemented yet (ID: ${relationshipId})`);
         toast({
            variant: 'default',
            title: 'Not Implemented',
            description: 'Deleting relationships is not yet supported.',
        });
        // Example structure:
        // startDeletingRelationshipTransition(async () => {
        //      const result = await deleteRelationshipAction(relationshipId);
        //      if (result.success) {
        //          setRelationships(prev => prev.filter(rel => rel.id !== relationshipId));
        //          toast(...);
        //      } else { ... }
        // });
   };

   // --- End Relationship Handlers ---


  return (
    <div className="space-y-6">
      {error && !isEditing && ( // Only show general error if not in edit mode
         <Alert variant="destructive">
           <AlertTitle>Error</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}

        {/* Current Data Card */}
        <Card>
            <CardHeader>
                <CardTitle>Current Data</CardTitle>
                <CardDescription>
                    {isEditing ? "Edit the JSON data below." : "The data currently stored in the database."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                 {isEditing ? (
                    <div className="space-y-2">
                        <Label htmlFor="edit-data-textarea">Edit Data (JSON)</Label>
                        <Textarea
                            id="edit-data-textarea"
                            value={editedJsonString}
                            onChange={handleEditChange}
                            className="min-h-[250px] font-mono text-sm"
                            disabled={isSaving}
                            aria-invalid={!!editError}
                            aria-describedby={editError ? "edit-error-desc" : undefined}
                        />
                        {editError && (
                            <p id="edit-error-desc" className="text-sm text-destructive">{editError}</p>
                        )}
                    </div>
                 ) : (
                    <pre className="p-4 bg-muted rounded-md overflow-auto text-sm">
                      {JSON.stringify(currentData, null, 2)}
                    </pre>
                 )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                 {isEditing ? (
                    <div className="flex gap-2">
                        <Button onClick={handleSaveChanges} disabled={isSaving || !!editError}>
                           {isSaving ? (
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           ) : (
                             <Save className="mr-2 h-4 w-4" />
                           )}
                           {isSaving ? 'Saving...' : 'Save Changes'}
                         </Button>
                         <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                             <XCircle className="mr-2 h-4 w-4"/>
                             Cancel
                         </Button>
                    </div>
                 ) : (
                    <div className="flex gap-2">
                        <Button onClick={handleEditClick} disabled={isCleaning || isSaving}>
                             <Edit className="mr-2 h-4 w-4" />
                             Edit
                         </Button>
                         <Button onClick={handleCleanData} disabled={isCleaning || isSaving || isAddingRelationship}>
                           {isCleaning ? (
                             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           ) : (
                             <Sparkles className="mr-2 h-4 w-4" />
                           )}
                           {isCleaning ? 'Cleaning...' : 'Clean Data with AI'}
                         </Button>
                    </div>
                 )}
            </CardFooter>
        </Card>


      {isCleaning && (
         <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="ml-2 text-muted-foreground">Generating cleaning suggestions...</p>
         </div>
      )}

      {/* AI Cleaning Suggestion Card */}
      {cleanedDataSuggestion && !isEditing && (
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
                   {isSaving ? 'Applying...' : 'Apply Suggestion'}
                 </Button>
           </CardFooter>
        </Card>
      )}

      {/* Relationships Card */}
      <Card>
        <CardHeader>
            <CardTitle>Related Data Entries</CardTitle>
            <CardDescription>Define and view relationships between this data entry (ID: {entryId}) and others.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             {relationshipError && (
                 <Alert variant="destructive">
                   <AlertTitle>Relationship Error</AlertTitle>
                   <AlertDescription>{relationshipError}</AlertDescription>
                 </Alert>
              )}

             {/* Add Relationship Form */}
             <div className="flex items-end gap-2">
                <div className="flex-grow space-y-1">
                    <Label htmlFor="target-entry-id">Target Entry ID</Label>
                    <Input
                        id="target-entry-id"
                        placeholder="Enter ID of related entry"
                        value={targetEntryId}
                        onChange={(e) => setTargetEntryId(e.target.value)}
                        disabled={isAddingRelationship}
                    />
                </div>
                 <Button onClick={handleAddRelationship} disabled={isAddingRelationship || isLoadingRelationships}>
                    {isAddingRelationship ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Plus className="mr-2 h-4 w-4" />
                    )}
                    {isAddingRelationship ? 'Adding...' : 'Add Relationship'}
                 </Button>
             </div>

             {/* Relationships Table */}
             <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Target Entry ID</TableHead>
                      <TableHead>Relationship ID</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingRelationships ? (
                       <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                <p className="mt-2 text-muted-foreground">Loading relationships...</p>
                            </TableCell>
                        </TableRow>
                    ) : relationships.length > 0 ? (
                      relationships.map((rel) => (
                        <TableRow key={rel.id}>
                          <TableCell>
                             <Link href={`/data/${rel.target_entry_id}`} className="underline hover:text-primary">
                                {rel.target_entry_id}
                             </Link>
                          </TableCell>
                          <TableCell>{rel.id}</TableCell>
                          <TableCell>{rel.created_at ? new Date(rel.created_at).toLocaleString() : 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            {/* Placeholder for future delete action */}
                            {/* <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteRelationship(rel.id!)} // Add delete handler
                                disabled={true} // Enable when implemented
                                aria-label="Delete relationship"
                                className="text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button> */}
                             <span className="text-xs text-muted-foreground italic">Delete N/A</span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No relationships found for this entry.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
             </div>
        </CardContent>
      </Card>
    </div>
  );
}
