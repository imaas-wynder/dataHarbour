// src/components/data-upload-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react"; // Added useState

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import type { DataEntry } from "@/services/database"; // Import DataEntry type
import { DataUploadConfirmationDialog } from "@/components/data-upload-confirmation-dialog"; // Import the new dialog component

// Basic schema, allows arbitrary key-value pairs via JSON input
const formSchema = z.object({
  jsonData: z.string().min(1, "JSON data cannot be empty").refine(
    (data) => {
      try {
        const parsed = JSON.parse(data);
        // Basic check if it's an object or an array of objects
        return typeof parsed === 'object' && parsed !== null;
      } catch (e) {
        return false;
      }
    },
    {
      message: "Invalid JSON format. Must be a single JSON object or an array of objects.",
    }
  ),
});

type FormData = z.infer<typeof formSchema>;

export function DataUploadForm() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false); // Use a general processing state
  const [parsedData, setParsedData] = useState<DataEntry | DataEntry[] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jsonData: "",
    },
  });

  // Function to handle closing the dialog and resetting the form
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setParsedData(null);
    form.reset(); // Reset form when dialog is closed/finished
  };


  async function onSubmit(values: FormData) {
    setIsProcessing(true); // Start processing indicator
    setError(null); // Clear previous errors
    try {
      const data = JSON.parse(values.jsonData);
      // Validate if it's an object or array of objects (already handled by zod refine, but good practice)
      if (typeof data !== 'object' || data === null) {
        throw new Error("Parsed data is not a valid object or array.");
      }
      console.log("Parsed data:", data);
      setParsedData(data);
      setIsDialogOpen(true); // Open the confirmation dialog
    } catch (error) {
      console.error("Parsing or validation failed:", error);
      let errorMessage = "Invalid JSON format or structure.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
       setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Invalid Data",
        description: errorMessage,
      });
    } finally {
        // Keep processing true while dialog is open? Maybe reset here? Let's reset.
       // setIsProcessing(false);
       // Let the dialog handle the final processing state indication
    }
  }

    // State for displaying parse errors directly on the form
    const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="jsonData"
            render={({ field }) => (
              <FormItem>
                <FormLabel>JSON Data</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Enter your data in JSON format. E.g., {"name": "Example", "value": 123} or [{"name": "Item 1", "value": 10}, {"name": "Item 2", "value": 20}]'
                    className="min-h-[150px] font-mono text-sm"
                    {...field}
                    aria-describedby="jsonData-description"
                    aria-invalid={!!form.formState.errors.jsonData || !!error} // Check both zod and manual error
                  />
                </FormControl>
                <p id="jsonData-description" className="text-sm text-muted-foreground">
                  Enter a single JSON object or an array of JSON objects.
                </p>
                {/* Display Zod errors first, then manual parse errors */}
                <FormMessage />
                 {error && !form.formState.errors.jsonData && (
                    <p className="text-sm font-medium text-destructive">{error}</p>
                )}
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isProcessing || isDialogOpen}>
            <Upload className="mr-2 h-4 w-4" />
            {isProcessing ? "Processing..." : "Upload Data"}
          </Button>
        </form>
      </Form>

      {/* Render the confirmation dialog */}
       <DataUploadConfirmationDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose} // Pass the close handler
          data={parsedData}
          onProcessingChange={setIsProcessing} // Allow dialog to control processing state
       />
    </>
  );
}
