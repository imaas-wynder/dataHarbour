// src/components/data-upload-confirmation-dialog.tsx
"use client";

import { useState, useTransition, useEffect } from "react"; // Added useEffect
import { useRouter } from "next/navigation";
import type { DataEntry } from "@/services/database";
import { uploadDataAction, updateDataAction, replaceDataAction } from "@/actions/data-actions"; // Added replaceDataAction
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, PlusCircle, Edit, FilePlus2 } from "lucide-react"; // Added FilePlus2

interface DataUploadConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: DataEntry | DataEntry[] | null;
  onProcessingChange: (isProcessing: boolean) => void; // To update parent form's state
}

type UploadAction = "addNew" | "amend" | "createNew"; // Added "createNew"

export function DataUploadConfirmationDialog({
  isOpen,
  onClose,
  data,
  onProcessingChange,
}: DataUploadConfirmationDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [actionType, setActionType] = useState<UploadAction>("addNew");
  const [amendTargetId, setAmendTargetId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens or data changes
  useEffect(() => {
    if (isOpen) {
      setActionType("addNew");
      setAmendTargetId("");
      setError(null);
    }
  }, [isOpen]);


  const handleConfirm = () => {
    if (!data) {
      setError("No data to process.");
      return;
    }

    // Basic validation for amend action
    if (actionType === "amend") {
      if (!amendTargetId.trim()) {
          setError("Target Entry ID is required to amend data.");
          toast({ variant: "destructive", title: "Error", description: "Target Entry ID cannot be empty." });
          return;
      }
      if (Array.isArray(data)) {
          setError("Amending data requires uploading a single JSON object, not an array.");
          toast({ variant: "destructive", title: "Error", description: "Cannot amend with an array." });
          return;
      }
    }
     // Basic validation for createNew action
     if (actionType === "createNew" && !Array.isArray(data)) {
        // Allow creating a new dataset from a single object, but maybe warn?
        // For now, allow it. User might want a dataset with just one item.
        // console.warn("Creating a new dataset from a single object.");
     }


    setError(null);
    onProcessingChange(true); // Signal parent that processing started

    startTransition(async () => {
      let result: { success: boolean; message?: string; error?: string };

      try {
        if (actionType === "addNew") {
          console.log("Dialog: Calling uploadDataAction (Add New)");
          result = await uploadDataAction(data);
        } else if (actionType === "amend"){
          // Amend logic (already validated above)
          console.log(`Dialog: Calling updateDataAction (Amend ID: ${amendTargetId})`);
          // updateDataAction replaces the data at the target ID with the new data
          result = await updateDataAction(amendTargetId.trim(), data as DataEntry); // Cast safe due to validation
        } else { // actionType === "createNew"
            console.log("Dialog: Calling replaceDataAction (Create New Data Set)");
             // Ensure data is passed correctly (might be single object or array)
            const dataToSend = Array.isArray(data) ? data : [data];
            result = await replaceDataAction(dataToSend);
        }

        if (result.success) {
          toast({
            title: "Success",
            description: result.message || "Data processed successfully.",
          });
          router.refresh(); // Refresh the page to show changes
          onClose(); // Close the dialog on success
        } else {
          setError(result.error || "Failed to process data.");
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "An unknown error occurred.",
          });
        }
      } catch (err) {
        console.error("Error during confirmation:", err);
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(message);
        toast({
          variant: "destructive",
          title: "Processing Error",
          description: message,
        });
      } finally {
         onProcessingChange(false); // Signal parent that processing finished
      }
    });
  };

  // Need to handle the case where the dialog is closed manually (X button or overlay click)
  const handleOpenChange = (open: boolean) => {
    if (!open) {
        // If closing manually while pending, it might be abrupt.
        // But generally, we just call the onClose provided by the parent.
        onClose();
    }
    // We don't control 'open' directly here, it's controlled by the parent via 'isOpen' prop
  };

  const getConfirmButtonLabel = () => {
    if (isPending) return "Processing...";
    switch (actionType) {
        case "addNew": return "Confirm Add New";
        case "amend": return "Confirm Amend";
        case "createNew": return "Confirm Create New";
        default: return "Confirm";
    }
  }

    const getConfirmButtonIcon = () => {
    if (isPending) return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
    switch (actionType) {
        case "addNew": return <PlusCircle className="mr-2 h-4 w-4" />;
        case "amend": return <Edit className="mr-2 h-4 w-4" />;
        case "createNew": return <FilePlus2 className="mr-2 h-4 w-4" />;
        default: return <Save className="mr-2 h-4 w-4" />;
    }
  }

  const isConfirmDisabled = () => {
     if (isPending || !data) return true;
     if (actionType === 'amend' && (!amendTargetId.trim() || Array.isArray(data))) return true;
     // No specific validation needed for createNew beyond having data
     return false;
  }


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirm Data Upload</DialogTitle>
          <DialogDescription>
            Review the data you uploaded and choose how to save it.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow border rounded-md p-4 my-4 bg-muted/50 overflow-auto">
             <Label>Uploaded Data Preview (JSON)</Label>
             <pre className="mt-2 text-xs font-mono whitespace-pre-wrap break-words">
                {data ? JSON.stringify(data, null, 2) : "No data loaded."}
             </pre>
        </ScrollArea>

        <div className="space-y-4">
          <RadioGroup
            value={actionType}
            onValueChange={(value: string) => setActionType(value as UploadAction)}
            className="flex flex-col space-y-1"
            disabled={isPending}
          >
            <div className="flex items-center space-x-3 space-y-0">
              <RadioGroupItem value="addNew" id="r1" />
              <Label htmlFor="r1" className="font-normal cursor-pointer flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-green-600" /> Add to Current Data Set
              </Label>
            </div>
             <p className="text-xs text-muted-foreground pl-8">Appends the uploaded entry/entries to the existing data.</p>

            <div className="flex items-center space-x-3 space-y-0 mt-2">
              <RadioGroupItem value="amend" id="r2" />
              <Label htmlFor="r2" className="font-normal cursor-pointer flex items-center gap-2">
                 <Edit className="h-4 w-4 text-blue-600" /> Amend Existing Entry
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-8">Replaces the data of a specific entry ID with the uploaded JSON object (requires single object upload).</p>


            <div className="flex items-center space-x-3 space-y-0 mt-2">
              <RadioGroupItem value="createNew" id="r3" />
              <Label htmlFor="r3" className="font-normal cursor-pointer flex items-center gap-2">
                 <FilePlus2 className="h-4 w-4 text-orange-600" /> Create New Data Set
              </Label>
            </div>
             <p className="text-xs text-muted-foreground pl-8">Replaces the entire current data set with the uploaded data. All existing data and relationships will be removed.</p>
          </RadioGroup>

          {actionType === "amend" && (
            <div className="grid w-full max-w-sm items-center gap-1.5 pl-8">
              <Label htmlFor="amend-id">Target Entry ID to Amend</Label>
              <Input
                id="amend-id"
                type="text"
                placeholder="Enter the ID of the entry to replace"
                value={amendTargetId}
                onChange={(e) => setAmendTargetId(e.target.value)}
                disabled={isPending}
                className="bg-background"
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={isConfirmDisabled()}>
             {getConfirmButtonIcon()}
            {getConfirmButtonLabel()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
