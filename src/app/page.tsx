import { DataUploadForm } from "@/components/data-upload-form";
import { DataPreviewTable } from "@/components/data-preview-table";
import { getAllData } from "@/services/database";
import type { DataEntry } from "@/services/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = 'force-dynamic'; // Ensure data is fetched on each request

export default async function Home() {
  let initialData: DataEntry[] = [];
  let error: string | null = null;

  try {
    initialData = await getAllData();
  } catch (e) {
    console.error("Failed to fetch data:", e);
    error = "Failed to load data. Please try again later.";
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Upload New Data</CardTitle>
        </CardHeader>
        <CardContent>
          <DataUploadForm />
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Data Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <DataPreviewTable initialData={initialData} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
