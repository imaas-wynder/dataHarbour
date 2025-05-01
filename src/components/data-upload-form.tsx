
// src/components/data-upload-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";

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
import type { DataEntry } from "@/services/types"; // Import DataEntry type
import { DataUploadConfirmationDialog } from "@/components/data-upload-confirmation-dialog";

// Basic schema, allows arbitrary key-value pairs via JSON input
const formSchema = z.object({
  jsonData: z.string().min(1, "JSON data cannot be empty").refine(
    (data) => {
      try {
        const parsed = JSON.parse(data);
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

interface DataUploadFormProps {
    allDatasetNames: string[]; // Receive all dataset names
}

export function DataUploadForm({ allDatasetNames }: DataUploadFormProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<DataEntry | DataEntry[] | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jsonData: "",
    },
  });

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setParsedData(null);
    form.reset();
  };

  async function onSubmit(values: FormData) {
    setIsProcessing(true);
    setError(null);
    try {
      const data = JSON.parse(values.jsonData);
      if (typeof data !== 'object' || data === null) {
        throw new Error("Parsed data is not a valid object or array.");
      }
      console.log("Parsed data:", data);
      setParsedData(data);
      setIsDialogOpen(true);
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
       setIsProcessing(false); // Stop processing on parse error
    }
    // Removed finally block, processing state is now managed by dialog
  }

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
                    aria-invalid={!!form.formState.errors.jsonData || !!error}
                    disabled={isProcessing || isDialogOpen} // Disable textarea while processing/dialog open
                  />
                </FormControl>
                <p id="jsonData-description" className="text-sm text-muted-foreground">
                  Enter a single JSON object or an array of JSON objects.
                </p>
                <FormMessage />
                 {error && !form.formState.errors.jsonData && (
                    <p className="text-sm font-medium text-destructive">{error}</p>
                )}
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isProcessing || isDialogOpen}>
            <Upload className="mr-2 h-4 w-4" />
            {isProcessing ? "Processing..." : isDialogOpen ? "Confirming..." : "Upload Data"}
          </Button>
        </form>
      </Form>

      {/* Render the confirmation dialog, passing dataset names */}
       <DataUploadConfirmationDialog
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          data={parsedData}
          onProcessingChange={setIsProcessing}
          allDatasetNames={allDatasetNames} // Pass the list of names
       />
    </>
  );
}
