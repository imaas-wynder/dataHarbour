"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation"; // Use next/navigation for App Router
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { uploadDataAction } from "@/actions/data-actions"; // Import server action
import { Upload } from "lucide-react";

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
      message: "Invalid JSON format",
    }
  ),
});

type FormData = z.infer<typeof formSchema>;

export function DataUploadForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jsonData: "",
    },
  });

  async function onSubmit(values: FormData) {
     startTransition(async () => {
        try {
          const data = JSON.parse(values.jsonData);
          const result = await uploadDataAction(data);

          if (result.success) {
            toast({
              title: "Success",
              description: "Data uploaded successfully.",
            });
            form.reset(); // Reset form on success
            router.refresh(); // Refresh the page to show new data in the preview table
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: result.error || "Failed to upload data.",
            });
          }
        } catch (error) {
             console.error("Upload failed:", error);
             let errorMessage = "An unexpected error occurred.";
             if (error instanceof Error) {
                 errorMessage = error.message;
             }
             toast({
               variant: "destructive",
               title: "Upload Error",
               description: errorMessage,
             });
        }
     });
  }

  return (
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
                />
              </FormControl>
               <p id="jsonData-description" className="text-sm text-muted-foreground">
                Enter a single JSON object or an array of JSON objects.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          <Upload className="mr-2 h-4 w-4" />
          {isPending ? "Uploading..." : "Upload Data"}
        </Button>
      </form>
    </Form>
  );
}
