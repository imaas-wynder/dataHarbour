// src/components/data-upload-confirmation-dialog.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DataEntry } from "@/services/database";
import { uploadDataAction, updateDataAction } from "@/actions/data-actions";
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
import { Loader2, Save, PlusCircle, Edit } from "lucide-react";

interface DataUploadConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: DataEntry | DataEntry[] | null;
  onProcessingChange: (isProcessing: boolean) => void; // To update parent form's state
}

type UploadAction = "addNew" | "amend";

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
  useState(() => {
    if (isOpen) {
      setActionType("addNew");
      setAmendTargetId("");
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);


  const handleConfirm = () => {
    if (!data) {
      setError("No data to process.");
      return;
    }

    setError(null);
    onProcessingChange(true); // Signal parent that processing started

    startTransition(async () => {
      let result: { success: boolean; message?: string; error?: string };

      try {
        if (actionType === "addNew") {
          console.log("Dialog: Calling uploadDataAction (Add New)");
          result = await uploadDataAction(data);
        } else {
          // Amend requires a target ID and data cannot be an array for simple replacement
          if (!amendTargetId.trim()) {
            throw new Error("Target Entry ID is required to amend data.");
          }
          if (Array.isArray(data)) {
            // Limitation: Can't amend with an array of entries directly.
            // User should upload a single object to replace an existing one.
             throw new Error("Amending data requires uploading a single JSON object, not an array.");
          }
          console.log(`Dialog: Calling updateDataAction (Amend ID: ${amendTargetId})`);
          // updateDataAction replaces the data at the target ID with the new data
          result = await updateDataAction(amendTargetId.trim(), data);
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
                <PlusCircle className="h-4 w-4 text-green-600" /> Add as New Entry / Entries
              </Label>
            </div>
            <div className="flex items-center space-x-3 space-y-0">
              <RadioGroupItem value="amend" id="r2" />
              <Label htmlFor="r2" className="font-normal cursor-pointer flex items-center gap-2">
                 <Edit className="h-4 w-4 text-blue-600" /> Amend Existing Entry (Replace Data)
              </Label>
            </div>
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
               <p className="text-xs text-muted-foreground">
                   The data for this ID will be completely replaced with the uploaded JSON object. This cannot be used with JSON arrays.
               </p>
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
          <Button onClick={handleConfirm} disabled={isPending || !data || (actionType === 'amend' && !amendTargetId.trim())}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
               actionType === 'addNew' ? <Save className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />
            )}
            {isPending ? "Processing..." : (actionType === 'addNew' ? "Confirm Add New" : "Confirm Amend")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
