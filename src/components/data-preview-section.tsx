// src/components/data-preview-section.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import type { DataEntry } from "@/services/database";
import { DataPreviewTable } from "@/components/data-preview-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface DataPreviewSectionProps {
  initialData: DataEntry[];
  error: string | null;
}

export function DataPreviewSection({ initialData, error: initialError }: DataPreviewSectionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(initialError);
  const { toast } = useToast();

  const handleRefresh = () => {
    setError(null); // Clear previous errors on refresh attempt
    startTransition(() => {
      try {
        router.refresh(); // Re-fetches data for the current route
        toast({
          title: "Data Refreshed",
          description: "The data preview has been updated.",
        });
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Data Preview</CardTitle>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isPending}
          aria-label="Refresh Data"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-destructive">{error}</p>
        ) : (
          <DataPreviewTable initialData={initialData} />
        )}
        {isPending && <p className="text-muted-foreground mt-2">Refreshing data...</p>}
      </CardContent>
    </Card>
  );
}
